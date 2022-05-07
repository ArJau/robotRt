var GtfsRealtimeBindings = require('gtfs-realtime-bindings');
var request = require('request');
var modelRepo = require('./model');
var fs = require('fs');

var lstUrlRt = [];

async function init() {

  await modelRepo.initModels();
  let map = modelRepo.mapModel();

  //let lstUrlRt = [];
  let criteria;
  criteria = { "resources.format": "gtfs-rt" };

  //criteria = { "id": "5f3b576ef388432cf6071cc6" };
  //criteria = { "id": "55ffbe0888ee387348ccb97d" };//brest
  //criteria = { "id": "5b0d18ed88ee3836341f603d" };
  //criteria = { "id": "5dfcf2a4634f4110fc360457" };

  map.get("circuits").find(criteria, async function (err, lstCircuits) {
    if (err) {
      console.log("err: " + err, true);
    }

    for (i in lstCircuits) {
      let circuit = lstCircuits[i];
      if (circuit.resources) {
        let url;
        let format;
        let id = circuit.id;
        let resource;
        for (let numResource in circuit.resources) {// a faire prendre les derniers fichier mis a jour
          //console.log("numResource: "+ numResource, true);
          resource = circuit.resources[numResource][0];
          url = resource.original_url;
          format = resource.format;

          if (format == "gtfs-rt") {
            lstUrlRt.push({ id: id, url: url });
          }

        }
        //console.log(url, true);
      }
      else {
        log("Resource inexistante id: " + id, true);
      }
    }
    await relance(); 
  });
}
 async function relance(){
  loadData();
  setTimeout(async function(){
    await relance(); 
  }, 120000);
 }

async function loadData(){
  await deleteModel("realTimesAlerts", "realTimesAlerts", {});
  await deleteModel("realTimesVehicles", "realTimesVehicles", {});
  for (let i in lstUrlRt) {
    log("*************************************************************************", true);
    log("Circuit: " + (Number(i) + 1) + ", id:" + lstUrlRt[i].id + ", url:" + lstUrlRt[i].url, true);
    await loadRealTime(lstUrlRt[i]);
  }
  log("..................fini.................", true)
}

function deleteModel(model, collectionName, criteria){
  return new Promise((resolve, reject)=>{
    let map = modelRepo.mapModel();
    map.get(model).deleteMany(criteria, function(err, delOK) {
          if (err) 
              reject();
          if (delOK) 
              resolve(log("Collection "+ collectionName + " deleted"));
      });
  })
}


async function loadRealTime(urlRt) {
  return new Promise(async (resolve, reject) => {
    try {
      let requestSettings = {
        method: 'GET',
        url: urlRt.url,
        encoding: null
      };
      request(requestSettings, async function (error, response, body) {
        if (!error && response.statusCode == 200) {
          try {
            var feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(body);
            let feedEntity = feed.entity;//.slice(0, 1);
            let feedEntityAlert = [];
            let feedEntityVehicle = [];
            for (let numEntity in feedEntity) {
              if (feedEntity[numEntity].vehicle) {
                feedEntity[numEntity].idReseau = urlRt.id;//on rajoute l'id
                feedEntityVehicle.push(feedEntity[numEntity]);
              }

              if (feedEntity[numEntity].alert) {
                feedEntity[numEntity].idReseau = urlRt.id;//on rajoute l'id
                feedEntityAlert.push(feedEntity[numEntity]);
              }
            }
            if (feedEntityVehicle.length > 0) {
              log(feedEntityVehicle.length + " VEHICULES (url: " + requestSettings.url + ") ", true);
              await insertDb("", urlRt.id, "realTimesVehicles", feedEntityVehicle);
            }
            if (feedEntityAlert.length > 0) { 
              log(feedEntityAlert.length + " ALERTS (url: " + requestSettings.url + ")", true);
              await insertDb("", urlRt.id, "realTimesAlerts", feedEntityAlert);
            }

            resolve();
          } catch (err) {
            resolve();
            log("ERROR : " + err, true);
          }
        } else {
          resolve();
        }
      });
    } catch (err) {
      log("ERROR : " + err, true);
      reject();
    }
  });

}

async function insertDb(fileName, id, model, tableauJson) {
  return new Promise(async (resolve, reject) => {
    try {
      for (let i in tableauJson) {
        tableauJson[i]["idReseau"] = id;
      }

      //console.log(tableauJson);
      let map = modelRepo.mapModel();
      map.get(model).insertMany(tableauJson, async (err, result) => {
        if (err) {
          log("CSV ERROR" + model + ",id: " + id, true)
          reject();
        }
        if (result) {
          resolve(log("CSV " + model + ",lignes: " + tableauJson.length + ", id: " + id + ", fileName=" + fileName));
        }
      });
    } catch (er) {
      log("CSV ERROR" + model + ",id: " + id + " fileName=" + fileName + ", er:" + er, true)
      reject();
    }
  });
}

function log(txt, isFichier) {
  const date = new Date();
  //const txt = date.toISOString() + ", " + txt;

  if (isFichier) {
    var nomFichier = date.getUTCFullYear() + (pad(date.getUTCMonth() + 1)) + date.getUTCDate() + ".log";

    fs.appendFile('log/' + nomFichier, txt + "\n", function (err) {
      if (err) { throw err };
    });
  }
  console.log(txt);
}

function logError(txt, isFichier) {
  const date = new Date();
  //const txt = date.toISOString() + ", " + txt;

  if (isFichier) {
    var nomFichier = date.getUTCFullYear() + (pad(date.getUTCMonth() + 1)) + date.getUTCDate() + ".log.error";

    fs.appendFile('log/' + nomFichier, txt + "\n", function (err) {
      if (err) { throw err };
    });
  }
}

init();

function pad(number) {
  if (number < 10) {
    return '0' + number;
  }
  return Number(number);
}
