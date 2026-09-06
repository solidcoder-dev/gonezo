package com.gonezo.application.query

data class MovementReuseTemplateTaxonomyRef(val id: String, val name: String)
data class MovementReuseTemplatePerson(val id: String, val name: String, val email: String?, val reimbursable: Boolean, val parts: Int?)
data class MovementReuseTemplateItem(val name: String, val amount: String)
data class MovementReuseTemplateShare(val person: String, val amount: String, val reimbursable: Boolean)
data class MovementReuseTemplateDetails(val amount: String, val items: List<MovementReuseTemplateItem>, val sharing: List<MovementReuseTemplateShare>)
data class MovementReuseTemplateRead(val movementId: String, val title: String, val accountId: String, val accountName: String, val financialType: String, val category: MovementReuseTemplateTaxonomyRef?, val tags: List<MovementReuseTemplateTaxonomyRef>, val itemNames: List<String>, val sharingPeople: List<MovementReuseTemplatePerson>, val targetAccountId: String?, val ignored: Boolean, val details: MovementReuseTemplateDetails?)

data class MovementReuseTemplateQuery(val representativeMovementId: String)

interface MovementReuseTemplateReadPort {
    fun readTemplate(representativeMovementId: String): MovementReuseTemplateRead?
}

class MovementReuseTemplateQueryService(private val readPort: MovementReuseTemplateReadPort) {
    fun get(query: MovementReuseTemplateQuery): MovementReuseTemplateRead? = readPort.readTemplate(query.representativeMovementId)
}
