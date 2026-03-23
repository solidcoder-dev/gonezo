import Foundation
import Capacitor

@objc(CorePlugin)
public class CorePlugin: CAPPlugin {
    private let supportedCurrencies = ["AUD", "BRL", "CAD", "CHF", "EUR", "GBP", "JPY", "MXN", "NZD", "USD"]
    private var accounts: [[String: Any]] = []
    private var transactions: [[String: Any]] = []
    private var taxonomyCategories: [[String: Any]] = []
    private var taxonomyTags: [[String: Any]] = []
    private var transactionTagsByTransactionId: [String: [String]] = [:]

    @objc func doThing(_ call: CAPPluginCall) {
        let input = call.getString("input") ?? ""
        call.resolve([
            "status": "ok",
            "message": "ios ledger stub ok: \(input)"
        ])
    }

    @objc func ledgerOpenAccount(_ call: CAPPluginCall) {
        let id = UUID().uuidString
        let name = (call.getString("name") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if name.isEmpty {
            call.reject("name is required")
            return
        }
        let type = (call.getString("type") ?? "cash").lowercased()
        let currency = (call.getString("currency") ?? "USD").uppercased()
        if !supportedCurrencies.contains(currency) {
            call.reject("unsupported currency code: \(currency)")
            return
        }
        let createdAt = call.getString("createdAt") ?? ISO8601DateFormatter().string(from: Date())
        let openingBalanceRaw = (call.getString("openingBalanceAmount") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let openingBalanceAmount: Double?
        if openingBalanceRaw.isEmpty {
            openingBalanceAmount = nil
        } else {
            guard let parsed = Double(openingBalanceRaw) else {
                call.reject("opening balance must be a valid number")
                return
            }
            openingBalanceAmount = parsed
        }
        accounts.append([
            "id": id,
            "name": name,
            "type": type,
            "currency": currency,
            "status": "active"
        ])

        if let openingBalanceAmount, openingBalanceAmount != 0 {
            let txId = UUID().uuidString
            transactions.append([
                "id": txId,
                "accountId": id,
                "type": openingBalanceAmount > 0 ? "income" : "expense",
                "status": "posted",
                "amount": String(format: "%.2f", abs(openingBalanceAmount)),
                "currency": currency,
                "occurredAt": createdAt,
                "description": "Opening balance",
                "merchant": NSNull(),
                "categoryId": NSNull(),
                "items": []
            ])
        }
        call.resolve(["id": id])
    }

    @objc func ledgerListSupportedCurrencies(_ call: CAPPluginCall) {
        call.resolve(["items": supportedCurrencies])
    }

    @objc func ledgerListAccounts(_ call: CAPPluginCall) {
        call.resolve(["items": accounts])
    }

    @objc func ledgerGetAccountSummary(_ call: CAPPluginCall) {
        guard let accountId = call.getString("accountId"),
              let account = accounts.first(where: { ($0["id"] as? String) == accountId }) else {
            call.reject("Account not found")
            return
        }

        var net: Double = 0
        for tx in transactions where (tx["accountId"] as? String) == accountId {
            guard (tx["status"] as? String) == "posted" else { continue }
            let amount = Double(tx["amount"] as? String ?? "0") ?? 0
            let type = tx["type"] as? String ?? "expense"
            if type == "income" { net += amount }
            if type == "expense" { net -= amount }
            if type == "transfer_in" { net += amount }
            if type == "transfer_out" { net -= amount }
        }

        call.resolve([
            "accountId": account["id"] as Any,
            "name": account["name"] as Any,
            "type": account["type"] as Any,
            "currency": account["currency"] as Any,
            "balanceAmount": String(format: "%.2f", net)
        ])
    }

    @objc func ledgerRecordExpense(_ call: CAPPluginCall) {
        createPostedTx(call, type: "expense")
    }

    @objc func ledgerRecordIncome(_ call: CAPPluginCall) {
        createPostedTx(call, type: "income")
    }

    @objc func ledgerRecordTransfer(_ call: CAPPluginCall) {
        let fromAccountId = call.getString("fromAccountId") ?? ""
        let toAccountId = call.getString("toAccountId") ?? ""
        if fromAccountId.isEmpty || toAccountId.isEmpty {
            call.reject("fromAccountId and toAccountId are required")
            return
        }
        if fromAccountId == toAccountId {
            call.reject("source and destination accounts must be different")
            return
        }

        let amount = call.getString("amount") ?? "0"
        let currency = (call.getString("currency") ?? "USD").uppercased()
        let occurredAt = call.getString("occurredAt") ?? ""
        let description = call.getString("description")

        let outId = UUID().uuidString
        let inId = UUID().uuidString

        transactions.append([
            "id": outId,
            "accountId": fromAccountId,
            "type": "transfer_out",
            "status": "posted",
            "amount": amount,
            "currency": currency,
            "occurredAt": occurredAt,
            "description": description as Any,
            "merchant": NSNull(),
            "categoryId": NSNull(),
            "linkedTransactionId": inId,
            "items": []
        ])
        transactions.append([
            "id": inId,
            "accountId": toAccountId,
            "type": "transfer_in",
            "status": "posted",
            "amount": amount,
            "currency": currency,
            "occurredAt": occurredAt,
            "description": description as Any,
            "merchant": NSNull(),
            "categoryId": NSNull(),
            "linkedTransactionId": outId,
            "items": []
        ])

        call.resolve([
            "transferOutId": outId,
            "transferInId": inId
        ])
    }

    @objc func ledgerCreateExpenseDraft(_ call: CAPPluginCall) {
        let id = UUID().uuidString
        let tx: [String: Any] = [
            "id": id,
            "accountId": call.getString("accountId") ?? "",
            "type": "expense",
            "status": "draft",
            "amount": call.getString("amount") ?? "0",
            "currency": call.getString("currency") ?? "USD",
            "occurredAt": call.getString("occurredAt") ?? "",
            "description": call.getString("description") as Any,
            "merchant": call.getString("merchant") as Any,
            "categoryId": call.getString("categoryId") as Any,
            "items": []
        ]
        transactions.append(tx)
        call.resolve(["id": id])
    }

    @objc func ledgerAddTransactionItem(_ call: CAPPluginCall) {
        call.resolve()
    }

    @objc func ledgerPostDraftTransaction(_ call: CAPPluginCall) {
        if let txId = call.getString("transactionId"),
           let index = transactions.firstIndex(where: { ($0["id"] as? String) == txId }) {
            transactions[index]["status"] = "posted"
        }
        call.resolve()
    }

    @objc func ledgerVoidTransaction(_ call: CAPPluginCall) {
        if let txId = call.getString("transactionId"),
           let index = transactions.firstIndex(where: { ($0["id"] as? String) == txId }) {
            transactions[index]["status"] = "voided"
            if let linked = transactions[index]["linkedTransactionId"] as? String,
               let linkedIndex = transactions.firstIndex(where: { ($0["id"] as? String) == linked }) {
                transactions[linkedIndex]["status"] = "voided"
            }
        }
        call.resolve()
    }

    @objc func ledgerListTransactions(_ call: CAPPluginCall) {
        let accountId = call.getString("accountId") ?? ""
        let items = transactions
            .filter { ($0["accountId"] as? String) == accountId }
            .sorted { lhs, rhs in
                let leftOccurredAt = (lhs["occurredAt"] as? String) ?? ""
                let rightOccurredAt = (rhs["occurredAt"] as? String) ?? ""
                if leftOccurredAt != rightOccurredAt {
                    return leftOccurredAt > rightOccurredAt
                }

                let leftId = (lhs["id"] as? String) ?? ""
                let rightId = (rhs["id"] as? String) ?? ""
                return leftId > rightId
            }
        call.resolve(["items": items])
    }

    @objc func taxonomyListCategories(_ call: CAPPluginCall) {
        let appliesTo = call.getString("appliesTo")?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let includeArchived = call.getBool("includeArchived") ?? false
        let items = taxonomyCategories.filter { category in
            let status = (category["status"] as? String ?? "active").lowercased()
            let categoryAppliesTo = (category["appliesTo"] as? String ?? "").lowercased()
            if !includeArchived && status == "archived" {
                return false
            }
            if let appliesTo, !appliesTo.isEmpty && categoryAppliesTo != appliesTo {
                return false
            }
            return true
        }
        call.resolve(["items": items])
    }

    @objc func taxonomyCreateCategory(_ call: CAPPluginCall) {
        let name = (call.getString("name") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let appliesTo = (call.getString("appliesTo") ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if name.isEmpty {
            call.reject("Category name is required")
            return
        }
        if appliesTo != "expense" && appliesTo != "income" {
            call.reject("appliesTo must be expense or income")
            return
        }

        let normalizedName = name.lowercased()
        let duplicated = taxonomyCategories.contains { category in
            let existingName = (category["name"] as? String ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            let existingAppliesTo = (category["appliesTo"] as? String ?? "").lowercased()
            return existingName == normalizedName && existingAppliesTo == appliesTo
        }
        if duplicated {
            call.reject("Category already exists for \(appliesTo): \(name)")
            return
        }

        let id = UUID().uuidString
        taxonomyCategories.append([
            "id": id,
            "name": name,
            "appliesTo": appliesTo,
            "status": "active"
        ])
        call.resolve(["id": id])
    }

    @objc func taxonomyListTags(_ call: CAPPluginCall) {
        let includeArchived = call.getBool("includeArchived") ?? false
        let items = taxonomyTags.filter { tag in
            let status = (tag["status"] as? String ?? "active").lowercased()
            return includeArchived || status != "archived"
        }.map { tag in
            [
                "id": tag["id"] as Any,
                "name": tag["name"] as Any,
                "status": tag["status"] as Any
            ]
        }
        call.resolve(["items": items])
    }

    @objc func mobillsImport(_ call: CAPPluginCall) {
        let fileBase64 = (call.getString("fileBase64") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if fileBase64.isEmpty {
            call.reject("fileBase64 is required")
            return
        }

        call.reject("mobillsImport is not implemented on iOS yet")
    }

    @objc func orchestrationCategorizeTransaction(_ call: CAPPluginCall) {
        let transactionId = (call.getString("transactionId") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let transactionType = (call.getString("transactionType") ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let categoryId = (call.getString("categoryId") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)

        if transactionId.isEmpty {
            call.reject("transactionId is required")
            return
        }
        if transactionType != "expense" && transactionType != "income" {
            call.reject("Only income/expense transactions can be categorized")
            return
        }

        if categoryId.isEmpty {
            call.resolve(["status": "none"])
            return
        }

        guard let category = taxonomyCategories.first(where: { ($0["id"] as? String) == categoryId }) else {
            call.resolve([
                "status": "failed",
                "categoryId": categoryId,
                "errorCode": "CATEGORY_NOT_FOUND",
                "errorMessage": "Category not found: \(categoryId)"
            ])
            return
        }

        let categoryStatus = (category["status"] as? String ?? "active").lowercased()
        let categoryAppliesTo = (category["appliesTo"] as? String ?? "").lowercased()
        if categoryStatus != "active" {
            call.resolve([
                "status": "failed",
                "categoryId": categoryId,
                "errorCode": "CATEGORY_ARCHIVED",
                "errorMessage": "Archived categories cannot be assigned"
            ])
            return
        }
        if categoryAppliesTo != transactionType {
            call.resolve([
                "status": "failed",
                "categoryId": categoryId,
                "errorCode": "CATEGORY_APPLIES_TO_MISMATCH",
                "errorMessage": "Category applies to \(categoryAppliesTo), got \(transactionType)"
            ])
            return
        }

        if let txIndex = transactions.firstIndex(where: { ($0["id"] as? String) == transactionId }) {
            transactions[txIndex]["categoryId"] = categoryId
        }

        call.resolve([
            "status": "assigned",
            "categoryId": categoryId
        ])
    }

    @objc func orchestrationApplyTransactionTags(_ call: CAPPluginCall) {
        let transactionId = (call.getString("transactionId") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if transactionId.isEmpty {
            call.reject("transactionId is required")
            return
        }

        let rawTagValues = call.getArray("tagNames") ?? []
        var uniqueByNormalizedName: [String: String] = [:]
        for value in rawTagValues {
            guard let rawTag = value as? String else { continue }
            let trimmed = rawTag.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmed.isEmpty {
                continue
            }
            let normalized = trimmed.lowercased()
            if uniqueByNormalizedName[normalized] == nil {
                uniqueByNormalizedName[normalized] = trimmed
            }
        }

        if uniqueByNormalizedName.isEmpty {
            transactionTagsByTransactionId[transactionId] = []
            call.resolve(["status": "none"])
            return
        }

        var resolvedTagIds: [String] = []
        for (normalizedName, rawName) in uniqueByNormalizedName {
            if let existingIndex = taxonomyTags.firstIndex(where: {
                (($0["normalizedName"] as? String) ?? "") == normalizedName
            }) {
                let status = (taxonomyTags[existingIndex]["status"] as? String ?? "active").lowercased()
                if status != "active" {
                    call.resolve([
                        "status": "failed",
                        "errorCode": "TAG_ARCHIVED",
                        "errorMessage": "Tag is archived: \((taxonomyTags[existingIndex]["name"] as? String) ?? normalizedName)"
                    ])
                    return
                }

                if let existingId = taxonomyTags[existingIndex]["id"] as? String {
                    resolvedTagIds.append(existingId)
                }
                continue
            }

            let id = UUID().uuidString
            taxonomyTags.append([
                "id": id,
                "name": rawName,
                "normalizedName": normalizedName,
                "status": "active"
            ])
            resolvedTagIds.append(id)
        }

        transactionTagsByTransactionId[transactionId] = resolvedTagIds
        call.resolve([
            "status": "assigned",
            "tagIds": resolvedTagIds
        ])
    }

    @objc func ledgerRenameAccount(_ call: CAPPluginCall) {
        let accountId = (call.getString("accountId") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let name = (call.getString("name") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !accountId.isEmpty else {
            call.reject("accountId is required")
            return
        }
        guard !name.isEmpty else {
            call.reject("name is required")
            return
        }
        guard let index = accounts.firstIndex(where: { ($0["id"] as? String) == accountId }) else {
            call.reject("Account not found")
            return
        }

        var updated = accounts[index]
        updated["name"] = name
        accounts[index] = updated
        call.resolve()
    }

    @objc func ledgerArchiveAccount(_ call: CAPPluginCall) {
        let accountId = (call.getString("accountId") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !accountId.isEmpty else {
            call.reject("accountId is required")
            return
        }
        guard let index = accounts.firstIndex(where: { ($0["id"] as? String) == accountId }) else {
            call.reject("Account not found")
            return
        }

        var updated = accounts[index]
        updated["status"] = "archived"
        accounts[index] = updated
        call.resolve()
    }

    @objc func ledgerDeleteAccount(_ call: CAPPluginCall) {
        let accountId = (call.getString("accountId") ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !accountId.isEmpty else {
            call.reject("accountId is required")
            return
        }
        guard accounts.contains(where: { ($0["id"] as? String) == accountId }) else {
            call.reject("Account not found")
            return
        }

        let removedTransactionIds: Set<String> = Set(
            transactions
                .filter { ($0["accountId"] as? String) == accountId }
                .compactMap { $0["id"] as? String }
        )

        transactions.removeAll { ($0["accountId"] as? String) == accountId }
        accounts.removeAll { ($0["id"] as? String) == accountId }
        for transactionId in removedTransactionIds {
            transactionTagsByTransactionId.removeValue(forKey: transactionId)
        }
        call.resolve()
    }

    private func createPostedTx(_ call: CAPPluginCall, type: String) {
        let id = UUID().uuidString
        let tx: [String: Any] = [
            "id": id,
            "accountId": call.getString("accountId") ?? "",
            "type": type,
            "status": "posted",
            "amount": call.getString("amount") ?? "0",
            "currency": call.getString("currency") ?? "USD",
            "occurredAt": call.getString("occurredAt") ?? "",
            "description": call.getString("description") as Any,
            "merchant": call.getString("merchant") as Any,
            "categoryId": call.getString("categoryId") as Any,
            "items": []
        ]
        transactions.append(tx)
        call.resolve(["id": id])
    }
}
