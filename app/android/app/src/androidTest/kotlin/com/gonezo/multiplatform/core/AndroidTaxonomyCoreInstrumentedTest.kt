package com.gonezo.multiplatform.core

import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AndroidTaxonomyCoreInstrumentedTest {
  @Test
  fun listsServicesFromAndroidTaxonomyPersistence() {
    val categories = AndroidTaxonomyCore.getInstance(
      ApplicationProvider.getApplicationContext()
    ).listCategories("expense", false)

    val services = categories.filter { it.name() == "Services" }
    assertEquals(1, services.size)
    assertTrue(services.single().status() == "active")
    assertEquals("expense", services.single().appliesTo())
  }
}
