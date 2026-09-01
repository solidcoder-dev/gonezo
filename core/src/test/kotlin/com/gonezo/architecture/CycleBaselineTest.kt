package com.gonezo.architecture

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class CycleBaselineTest {
    @Test
    fun `inherited cycles may be removed`() {
        assertThat(CycleBaseline.newCycles(setOf("a"), setOf("a", "b"))).isEmpty()
    }

    @Test
    fun `inherited cycles may remain`() {
        assertThat(CycleBaseline.newCycles(setOf("a"), setOf("a"))).isEmpty()
    }

    @Test
    fun `new cycles are reported`() {
        assertThat(CycleBaseline.newCycles(setOf("a", "b"), setOf("a"))).containsExactly("b")
    }

    @Test
    fun `empty cycle sets are allowed`() {
        assertThat(CycleBaseline.newCycles(emptySet(), emptySet())).isEmpty()
    }
}
