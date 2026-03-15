import Foundation
import Capacitor

@objc(CorePlugin)
public class CorePlugin: CAPPlugin {
    private let supportedCurrencies = ["AUD", "BRL", "CAD", "CHF", "EUR", "GBP", "JPY", "MXN", "NZD", "USD"]
    private var accounts: [[String: Any]] = []
    private var transactions: [[String: Any]] = []

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
        let items = transactions.filter { ($0["accountId"] as? String) == accountId }
        call.resolve(["items": items])
    }

    @objc func ledgerRenameAccount(_ call: CAPPluginCall) { call.resolve() }
    @objc func ledgerArchiveAccount(_ call: CAPPluginCall) { call.resolve() }

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
