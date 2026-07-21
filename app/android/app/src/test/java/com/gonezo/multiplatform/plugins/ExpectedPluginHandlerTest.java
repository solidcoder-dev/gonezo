package com.gonezo.multiplatform.plugins;

import com.gonezo.application.orchestration.ExpectedPostingMovementSnapshot;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThrows;

public class ExpectedPluginHandlerTest {
  private static final String ACCOUNT_ID = UUID.randomUUID().toString();

  @Test
  public void mapsFinalPostingSnapshotFields() throws Exception {
    ExpectedPostingMovementSnapshot snapshot = map(new JSONObject()
      .put("accountId", ACCOUNT_ID)
      .put("type", "income")
      .put("amount", "50.00")
      .put("currency", "GBP")
      .put("description", "Actual final")
      .put("merchant", "Actual merchant")
      .put("splitItems", new JSONArray()
        .put(new JSONObject().put("id", "item-final").put("name", "Final item").put("amount", "50.00"))));

    assertEquals(ACCOUNT_ID, snapshot.getAccountId());
    assertEquals("INCOME", snapshot.getType().name());
    assertEquals("50.00", snapshot.getAmount().toPlainString());
    assertEquals("GBP", snapshot.getCurrency());
    assertEquals("Actual final", snapshot.getDescription());
    assertEquals("Actual merchant", snapshot.getMerchant());
    assertEquals("item-final", snapshot.getSplitItems().get(0).getId());
    assertEquals("Final item", snapshot.getSplitItems().get(0).getName());
    assertEquals("50.00", snapshot.getSplitItems().get(0).getAmount().toPlainString());
  }

  @Test
  public void rejectsMissingRequiredSnapshotFields() throws Exception {
    String[] fields = {"accountId", "type", "amount", "currency"};
    for (String missing : fields) {
      JSONObject movement = new JSONObject()
        .put("accountId", ACCOUNT_ID)
        .put("type", "expense")
        .put("amount", "50.00")
        .put("currency", "GBP")
        .put("splitItems", new JSONArray());
      movement.remove(missing);

      InvocationTargetException failure = assertThrows(InvocationTargetException.class, () -> map(movement));
      assertEquals(missing + " is required", failure.getCause().getMessage());
    }
  }

  private ExpectedPostingMovementSnapshot map(JSONObject movement) throws Exception {
    ExpectedPluginHandler handler = new ExpectedPluginHandler(null);
    Method mapper = ExpectedPluginHandler.class.getDeclaredMethod("toPostingMovementSnapshot", JSONObject.class);
    mapper.setAccessible(true);
    return (ExpectedPostingMovementSnapshot) mapper.invoke(handler, movement);
  }
}
