package com.gonezo.multiplatform.storage;

import fi.iki.elonen.NanoHTTPD;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

final class LocalStorageHttpServer extends NanoHTTPD {
  private static final String ROUTE_PREFIX = "/storage/";
  private static final Logger LOGGER = Logger.getLogger("GonezoStorage");
  private final LocalStorageRepository repository;
  private final SignedUrlSigner signer;

  LocalStorageHttpServer(int port, LocalStorageRepository repository, SignedUrlSigner signer) {
    super("127.0.0.1", port);
    this.repository = repository;
    this.signer = signer;
  }

  @Override
  public Response serve(IHTTPSession session) {
    logInfo("storage_http_request method=" + session.getMethod() + " path=" + session.getUri());
    if (session.getMethod() != Method.GET) {
      logWarn("storage_http_rejected reason=method_not_allowed method=" + session.getMethod());
      return newFixedLengthResponse(Response.Status.METHOD_NOT_ALLOWED, "text/plain", "Method not allowed");
    }

    String uri = session.getUri();
    StorageRef ref = decodeRefFromUri(uri);
    if (ref == null) {
      logWarn("storage_http_rejected reason=invalid_path path=" + uri);
      return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Not found");
    }

    long expiry = parseExpiry(session.getParameters());
    String signature = firstParam(session.getParameters(), "sig");
    if (expiry <= 0 || signature == null) {
      logWarn("storage_http_rejected reason=invalid_signed_url namespace=" + ref.namespace() + " path=" + ref.path());
      return newFixedLengthResponse(Response.Status.FORBIDDEN, "text/plain", "Invalid signed URL");
    }
    if (Instant.now().getEpochSecond() > expiry) {
      logWarn("storage_http_rejected reason=expired namespace=" + ref.namespace() + " path=" + ref.path() + " exp=" + expiry);
      return newFixedLengthResponse(Response.Status.FORBIDDEN, "text/plain", "Signed URL expired");
    }

    String canonicalPath = encodePath(ref);
    if (!signer.verify("GET", canonicalPath, expiry, signature)) {
      logWarn("storage_http_rejected reason=invalid_signature namespace=" + ref.namespace() + " path=" + ref.path());
      return newFixedLengthResponse(Response.Status.FORBIDDEN, "text/plain", "Invalid signature");
    }

    StoredObject object = repository.get(ref);
    if (object == null) {
      logWarn("storage_http_rejected reason=object_not_found namespace=" + ref.namespace() + " path=" + ref.path());
      return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Object not found");
    }

    try {
      FileInputStream input = new FileInputStream(object.file());
      String contentType = object.metadata().contentType().isBlank() ? "application/octet-stream" : object.metadata().contentType();
      Response response = newChunkedResponse(Response.Status.OK, contentType, input);
      response.addHeader("Content-Length", String.valueOf(object.file().length()));
      String filename = object.metadata().filename();
      if (filename != null && !filename.isBlank()) {
        response.addHeader("Content-Disposition", "attachment; filename=\"" + filename.replace("\"", "") + "\"");
      }
      response.addHeader("Accept-Ranges", "bytes");
      logInfo(
        "storage_http_response status=200 namespace=" + ref.namespace() + " path=" + ref.path() + " bytes=" + object.file().length() + " contentType=" + contentType
      );
      return response;
    } catch (FileNotFoundException ex) {
      logWarn("storage_http_rejected reason=file_not_found namespace=" + ref.namespace() + " path=" + ref.path());
      return newFixedLengthResponse(Response.Status.NOT_FOUND, "text/plain", "Object not found");
    }
  }

  static String encodePath(StorageRef ref) {
    StringBuilder builder = new StringBuilder(ROUTE_PREFIX);
    builder.append(encodeSegment(ref.namespace()));
    String[] segments = ref.path().split("/");
    for (String segment : segments) {
      builder.append('/').append(encodeSegment(segment));
    }
    return builder.toString();
  }

  private StorageRef decodeRefFromUri(String uri) {
    if (uri == null || !uri.startsWith(ROUTE_PREFIX)) {
      return null;
    }
    String remainder = uri.substring(ROUTE_PREFIX.length());
    if (remainder.isBlank()) {
      return null;
    }
    String[] segments = remainder.split("/");
    if (segments.length < 2) {
      return null;
    }
    String namespace = decodeSegment(segments[0]);
    StringBuilder pathBuilder = new StringBuilder();
    for (int i = 1; i < segments.length; i++) {
      if (pathBuilder.length() > 0) {
        pathBuilder.append('/');
      }
      pathBuilder.append(decodeSegment(segments[i]));
    }
    if (namespace == null || namespace.isBlank() || pathBuilder.length() == 0) {
      return null;
    }
    return new StorageRef(namespace, pathBuilder.toString());
  }

  private long parseExpiry(Map<String, List<String>> params) {
    String raw = firstParam(params, "exp");
    if (raw == null || raw.isBlank()) {
      return -1L;
    }
    try {
      return Long.parseLong(raw);
    } catch (NumberFormatException ex) {
      return -1L;
    }
  }

  private static String firstParam(Map<String, List<String>> params, String key) {
    List<String> values = params.get(key);
    if (values == null || values.isEmpty()) {
      return null;
    }
    return values.get(0);
  }

  private static String encodeSegment(String value) {
    StringBuilder output = new StringBuilder();
    for (char character : value.toCharArray()) {
      if (isUnreserved(character)) {
        output.append(character);
      } else {
        output.append('%').append(String.format("%02X", (int) character));
      }
    }
    return output.toString();
  }

  private static String decodeSegment(String value) {
    try {
      return URLDecoder.decode(value, StandardCharsets.UTF_8);
    } catch (IllegalArgumentException ex) {
      return null;
    }
  }

  private static boolean isUnreserved(char character) {
    return (character >= 'A' && character <= 'Z')
      || (character >= 'a' && character <= 'z')
      || (character >= '0' && character <= '9')
      || character == '-' || character == '_' || character == '.' || character == '~';
  }

  private static void logInfo(String message) {
    LOGGER.info(message);
  }

  private static void logWarn(String message) {
    LOGGER.warning(message);
  }
}
