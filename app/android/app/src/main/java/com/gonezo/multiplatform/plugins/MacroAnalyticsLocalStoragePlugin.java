package com.gonezo.multiplatform.plugins;

import com.gonezo.multiplatform.core.AndroidMacroAnalyticsOutboxRepository;
import com.gonezo.multiplatform.core.AndroidMacroAnalyticsLatestPublicationRepository;
import com.gonezo.multiplatform.core.AndroidMacroAnalyticsContributorRepository;
import com.gonezo.multiplatform.core.AndroidMacroAnalyticsRebuildRepository;
import com.gonezo.multiplatform.core.CoreDatabase;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MacroAnalyticsLocalStoragePlugin")
public class MacroAnalyticsLocalStoragePlugin extends Plugin {
  private CoreDatabase database;

  @PluginMethod public void getContributorId(PluginCall call) {
    withUser(call, (userId, database) -> {
      JSObject result = new JSObject();
      String id = new AndroidMacroAnalyticsContributorRepository(database).get(userId);
      if (id != null && !id.isEmpty()) result.put("contributorId", id);
      call.resolve(result);
    });
  }

  @PluginMethod public void saveContributorId(PluginCall call) {
    String contributorId = call.getString("contributorId");
    if (contributorId == null || contributorId.trim().isEmpty()) {
      call.reject("Analytics contributor ID is required", "INVALID_CONTRIBUTOR_ID");
      return;
    }
    withUser(call, (userId, database) -> {
      new AndroidMacroAnalyticsContributorRepository(database).save(userId, contributorId);
      call.resolve();
    });
  }

  @PluginMethod public void getPublication(PluginCall call) {
    String period = call.getString("period");
    withUser(call, (userId, database) -> {
      JSObject result = new JSObject();
      String publication = period == null ? null : new AndroidMacroAnalyticsOutboxRepository(database).get(userId, period);
      if (publication != null) result.put("publication", new JSObject(publication));
      call.resolve(result);
    });
  }

  @PluginMethod public void savePublication(PluginCall call) {
    JSObject publication = call.getObject("publication");
    String period = publication == null ? null : publication.getString("period");
    if (period == null || period.isEmpty()) {
      call.reject("Publication period is required", "INVALID_PUBLICATION");
      return;
    }
    withUser(call, (userId, database) -> {
      new AndroidMacroAnalyticsOutboxRepository(database).save(userId, publication.toString());
      call.resolve();
    });
  }

  @PluginMethod public void removePublication(PluginCall call) {
    String period = call.getString("period");
    withUser(call, (userId, database) -> {
      new AndroidMacroAnalyticsOutboxRepository(database).remove(userId, period);
      call.resolve();
    });
  }

  @PluginMethod public void listPublications(PluginCall call) {
    withUser(call, (userId, database) -> {
      JSArray publications = new JSArray();
      for (String publication : new AndroidMacroAnalyticsOutboxRepository(database).listPending(userId)) publications.put(new JSObject(publication));
      JSObject result = new JSObject();
      result.put("publications", publications);
      call.resolve(result);
    });
  }

  @PluginMethod public void clearPublications(PluginCall call) {
    withUser(call, (userId, database) -> {
      new AndroidMacroAnalyticsOutboxRepository(database).clear(userId);
      call.resolve();
    });
  }

  @PluginMethod public void getLatestPublication(PluginCall call) {
    String contributorId = call.getString("contributorId");
    String period = call.getString("period");
    try {
      String publication = new AndroidMacroAnalyticsLatestPublicationRepository(database()).find(contributorId, period);
      JSObject result = new JSObject();
      if (publication != null) result.put("publication", new JSObject(publication));
      call.resolve(result);
    } catch (Exception error) {
      call.reject("Macro analytics local storage failed", "MACRO_ANALYTICS_STORAGE_FAILURE");
    }
  }

  @PluginMethod public void saveLatestPublication(PluginCall call) {
    JSObject publication = call.getObject("publication");
    if (publication == null) {
      call.reject("Publication is required", "INVALID_PUBLICATION");
      return;
    }
    try {
      new AndroidMacroAnalyticsLatestPublicationRepository(database()).save(publication.toString());
      call.resolve();
    } catch (Exception error) {
      call.reject("Macro analytics local storage failed", "MACRO_ANALYTICS_STORAGE_FAILURE");
    }
  }

  @PluginMethod public void listLatestPublications(PluginCall call) {
    String period = call.getString("period");
    if (period == null || period.isEmpty()) {
      call.reject("Publication period is required", "INVALID_PERIOD");
      return;
    }
    try {
      JSArray publications = new JSArray();
      for (String publication : new AndroidMacroAnalyticsLatestPublicationRepository(database()).list(period)) {
        publications.put(new JSObject(publication));
      }
      JSObject result = new JSObject();
      result.put("publications", publications);
      call.resolve(result);
    } catch (Exception error) {
      call.reject("Macro analytics local storage failed", "MACRO_ANALYTICS_STORAGE_FAILURE");
    }
  }

  @PluginMethod public void enqueueRebuildPeriod(PluginCall call) {
    String period = call.getString("period");
    withUser(call, (userId, database) -> {
      new AndroidMacroAnalyticsRebuildRepository(database).enqueue(userId, period);
      call.resolve();
    });
  }

  @PluginMethod public void listRebuildPeriods(PluginCall call) {
    withUser(call, (userId, database) -> {
      JSArray periods = new JSArray();
      for (String period : new AndroidMacroAnalyticsRebuildRepository(database).list(userId)) periods.put(period);
      JSObject result = new JSObject();
      result.put("periods", periods);
      call.resolve(result);
    });
  }

  @PluginMethod public void removeRebuildPeriod(PluginCall call) {
    String period = call.getString("period");
    withUser(call, (userId, database) -> {
      new AndroidMacroAnalyticsRebuildRepository(database).remove(userId, period);
      call.resolve();
    });
  }

  @PluginMethod public void clearRebuildPeriods(PluginCall call) {
    withUser(call, (userId, database) -> {
      new AndroidMacroAnalyticsRebuildRepository(database).clearPeriods(userId);
      call.resolve();
    });
  }

  @PluginMethod public void getBackfillState(PluginCall call) {
    withUser(call, (userId, database) -> {
      AndroidMacroAnalyticsRebuildRepository repository = new AndroidMacroAnalyticsRebuildRepository(database);
      JSObject result = new JSObject();
      result.put("initialBackfillVersion", repository.getInitialBackfillVersion(userId));
      result.put("fullRebuildRequested", repository.isFullRebuildRequested(userId));
      result.put("fullRebuildRequestVersion", repository.getFullRebuildRequestVersion(userId));
      call.resolve(result);
    });
  }

  @PluginMethod public void markInitialBackfillComplete(PluginCall call) {
    Integer version = call.getInt("version");
    if (version == null || version < 1) {
      call.reject("Backfill version must be positive", "INVALID_BACKFILL_VERSION");
      return;
    }
    withUser(call, (userId, database) -> {
      new AndroidMacroAnalyticsRebuildRepository(database).markInitialBackfillComplete(userId, version);
      call.resolve();
    });
  }

  @PluginMethod public void requestFullRebuild(PluginCall call) {
    withUser(call, (userId, database) -> {
      new AndroidMacroAnalyticsRebuildRepository(database).requestFullRebuild(userId);
      call.resolve();
    });
  }

  @PluginMethod public void clearFullRebuildRequest(PluginCall call) {
    Integer expectedRequestVersion = call.getInt("expectedRequestVersion");
    if (expectedRequestVersion == null || expectedRequestVersion < 0) {
      call.reject("Full rebuild request version is required", "INVALID_BACKFILL_VERSION");
      return;
    }
    withUser(call, (userId, database) -> {
      new AndroidMacroAnalyticsRebuildRepository(database).clearFullRebuildRequest(userId, expectedRequestVersion);
      call.resolve();
    });
  }

  @PluginMethod public void clearBackfillState(PluginCall call) {
    withUser(call, (userId, database) -> {
      new AndroidMacroAnalyticsRebuildRepository(database).clearState(userId);
      call.resolve();
    });
  }

  private interface UserOperation { void run(String userId, CoreDatabase database) throws Exception; }

  private void withUser(PluginCall call, UserOperation operation) {
    String userId = call.getString("userId");
    if (userId == null || userId.isEmpty()) {
      call.reject("Authenticated user is required", "INVALID_USER");
      return;
    }
    try {
      CoreDatabase activeDatabase = database();
      new MacroAnalyticsLegacyMigration(new LegacyMacroAnalyticsStorageReader(getContext())).migrate(userId, activeDatabase);
      operation.run(userId, activeDatabase);
    } catch (Exception error) {
      call.reject("Macro analytics local storage failed", "MACRO_ANALYTICS_STORAGE_FAILURE");
    }
  }

  private synchronized CoreDatabase database() {
    if (database == null) database = new CoreDatabase(getContext().getApplicationContext());
    return database;
  }

}
