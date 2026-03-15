import Foundation
import Capacitor

@objc(CorePlugin)
public class CorePlugin: CAPPlugin {
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
        accounts.append([
            "id": id,
            "name": name,
            "type": type,
            "currency": currency,
            "status": "active"
        ])
        call.resolve(["id": id])
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
