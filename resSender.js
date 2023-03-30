// @name Resources Sender
// @param(number) waitBeforeStart=60000
// @param(number) groupId=0
// @param(number) resourcesReserve=0
// @param(string) destinyCoord
// @step {gameUrl}/game.php?screen=overview&group={groupId}

const { destinyCoord } = TWA;

$.getScript("https://shinko-to-kuma.com/scripts/res-senderV2.js");

window.alert = function() {
    console.log.apply(console, arguments);
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function automate() {
  await delay(5000);
  $("#coordinateTargetFirstTime").val(destinyCoord);
  $("#saveCoord").click();
  await delay(TWA.waitBeforeStart ?? 60000)
  while (true) {
    await delay(1000);
    $("#resPercent").val(resourcesReserve);
    const button = $("#sendResources.btn")[0];
    if (button) button.click();
    else break;
  }
}

automate();
