const request = require("request");

const command_path = "/cgi-bin/directsend?";

const query_path = "/cgi-bin/json_query?jsoncallback=";

// High enough timeout on my network seems to be around 50ms for my projector. So 1.5s feels more than enough.
const timeout = 1500;

var Service;
var Characteristic;
var debug;

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-epson-projector-api-and-ir", "EpsonProjector", EpsonProjector);
};


function EpsonProjector(log, config) {
    this.log = log;
    debug = config["debug"];
    this.ip = config["ip"];
    this.irip = config["irip"];
    this.model = config["model"] === undefined ? "" : config["model"];
    this.serial = config["serial"] === undefined ? "" : config["serial"];
    this.name = config["name"];
}

EpsonProjector.prototype = {

    getPowerState: function (callback) {

        if (debug) {
            console.log("Get power state for Epson Projector");
        }
        request.get({
            uri: "http://" + this.ip + query_path + "PWR?",
            headers: {
                "Referer": "http://" + this.ip + "/cgi-bin/webconf",
            },
            timeout: timeout
        }, function (error, response, body) {
            if (error !== null) {
                if (debug) {
                    console.log(error)
                }
                callback(null, false) // If error is returned, assume that Projector is OFF
                //callback(error);
                return;
            }
            try {
                if (debug) {
                    console.log("-Response\n" + response + "\n-Body\n" + body)
                }
                callback(null, JSON.parse(body)["projector"]["feature"]["reply"] === "01")
            } catch (error) {
                if (debug) {
                    console.log(error)
                }
                callback(error);
            }
        });
    },

    setPowerState: function(powerOn, callback) {
        let uri;
        if (powerOn) {
            uri = "http://" + this.irip + "/ir/PROJECTOR_ON";
        } else {
            uri = "http://" + this.ip + command_path + "PWR=OFF";
        }
        if (debug) {
            console.log("Setting power state for Epson Projector");
        }
        request.get({
            uri: uri,
            headers: {
                "Referer": "http://" + this.ip + "/cgi-bin/webconf",
            },
            timeout: timeout
        }, function (error, response, body) {
            if (debug) {
                console.log(error);
            }
            callback();
        });
    },

    getServices: function () {
        const informationService = new Service.AccessoryInformation();

        informationService
            .setCharacteristic(Characteristic.Manufacturer, "EPSON")
            .setCharacteristic(Characteristic.Model, this.model)
            .setCharacteristic(Characteristic.SerialNumber, this.serial);

        switchService = new Service.Switch(this.name);
        switchService
            .getCharacteristic(Characteristic.On)
                .on('get', this.getPowerState.bind(this))
                .on('set', this.setPowerState.bind(this));

        this.informationService = informationService;
        this.switchService = switchService;
        return [informationService, switchService];
    }
};
