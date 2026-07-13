package com.gonezo.multiplatform.plugins.interpretation

import java.io.File
import javax.xml.XMLConstants
import javax.xml.parsers.DocumentBuilderFactory
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.w3c.dom.Node
import org.w3c.dom.NodeList

class AndroidManifestStructureTest {
  @Test
  fun `declares the GPU native libraries inside the application element`() {
    val manifest = File("src/main/AndroidManifest.xml")
    val document = DocumentBuilderFactory.newInstance().apply {
      isNamespaceAware = true
      setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true)
    }.newDocumentBuilder().parse(manifest)

    val application = document.getElementsByTagName("application").item(0)
    assertNotNull(application)
    val nativeLibraries = children(application as Node).filter { it.nodeName == "uses-native-library" }
    assertEquals(2, nativeLibraries.size)
    assertEquals(setOf("libOpenCL.so", "libvndksupport.so"), nativeLibraries.mapNotNull { it.attributes?.getNamedItemNS("http://schemas.android.com/apk/res/android", "name")?.nodeValue }.toSet())
  }

  private fun children(node: Node): List<Node> {
    val nodes = mutableListOf<Node>()
    val childNodes: NodeList = node.childNodes
    for (index in 0 until childNodes.length) {
      nodes += childNodes.item(index)
    }
    return nodes
  }
}
