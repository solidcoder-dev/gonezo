package com.gonezo.multiplatform.storage;

import android.content.Context;
import com.gonezo.multiplatform.R;
import java.io.InputStream;
import java.security.KeyStore;
import java.security.SecureRandom;
import java.security.cert.Certificate;
import java.util.Enumeration;
import java.util.Locale;
import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLServerSocketFactory;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManagerFactory;

public final class LoopbackTlsIdentity {
  private static final String PKCS12_TYPE = "PKCS12";
  private static final char[] KEYSTORE_PASSWORD = "changeit".toCharArray();
  private static final String LOOPBACK_ALIAS = "gonezo-loopback";

  private LoopbackTlsIdentity() {
    // utility
  }

  public static SSLServerSocketFactory createServerSocketFactory(Context context) {
    try {
      KeyStore keyStore = loadKeyStore(context);
      KeyManagerFactory keyManagerFactory = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
      keyManagerFactory.init(keyStore, KEYSTORE_PASSWORD);

      SSLContext sslContext = SSLContext.getInstance("TLS");
      sslContext.init(keyManagerFactory.getKeyManagers(), null, new SecureRandom());
      return sslContext.getServerSocketFactory();
    } catch (Exception ex) {
      throw new IllegalStateException("Cannot create loopback TLS server socket factory", ex);
    }
  }

  public static SSLSocketFactory createClientSocketFactory(Context context) {
    try {
      Certificate certificate = loadCertificate(context);
      KeyStore trustStore = KeyStore.getInstance(KeyStore.getDefaultType());
      trustStore.load(null, null);
      trustStore.setCertificateEntry("gonezo-loopback-cert", certificate);

      TrustManagerFactory trustManagerFactory = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
      trustManagerFactory.init(trustStore);

      SSLContext sslContext = SSLContext.getInstance("TLS");
      sslContext.init(null, trustManagerFactory.getTrustManagers(), new SecureRandom());
      return sslContext.getSocketFactory();
    } catch (Exception ex) {
      throw new IllegalStateException("Cannot create loopback TLS client socket factory", ex);
    }
  }

  public static HostnameVerifier createHostnameVerifier() {
    HostnameVerifier delegate = HttpsURLConnection.getDefaultHostnameVerifier();
    return (hostname, session) -> isLoopbackHost(hostname) && delegate.verify(hostname, session);
  }

  public static boolean isLoopbackHost(String hostname) {
    if (hostname == null) {
      return false;
    }
    String normalized = hostname.trim().toLowerCase(Locale.ROOT);
    return "localhost".equals(normalized)
      || "127.0.0.1".equals(normalized)
      || "::1".equals(normalized)
      || "0:0:0:0:0:0:0:1".equals(normalized);
  }

  private static KeyStore loadKeyStore(Context context) throws Exception {
    KeyStore keyStore = KeyStore.getInstance(PKCS12_TYPE);
    try (InputStream input = context.getResources().openRawResource(R.raw.gonezo_loopback_tls)) {
      keyStore.load(input, KEYSTORE_PASSWORD);
    }
    return keyStore;
  }

  private static Certificate loadCertificate(Context context) throws Exception {
    KeyStore keyStore = loadKeyStore(context);
    Certificate certificate = keyStore.getCertificate(LOOPBACK_ALIAS);
    if (certificate != null) {
      return certificate;
    }
    Enumeration<String> aliases = keyStore.aliases();
    while (aliases.hasMoreElements()) {
      String alias = aliases.nextElement();
      Certificate current = keyStore.getCertificate(alias);
      if (current != null) {
        return current;
      }
    }
    throw new IllegalStateException("No certificate found in loopback TLS keystore");
  }
}
