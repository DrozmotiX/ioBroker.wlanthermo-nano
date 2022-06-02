var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target, mod));
var utils = __toESM(require("@iobroker/adapter-core"));
var import_axios = __toESM(require("axios"));
var import_stateDefinitions = require("./lib/stateDefinitions");
const activeDevices = {};
const polling = {};
const createdObjs = [];
let initializing = true;
class WlanthermoNano extends utils.Adapter {
  constructor(options = {}) {
    super(__spreadProps(__spreadValues({}, options), {
      name: "wlanthermo-nano"
    }));
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  async onReady() {
    this.setState("info.connection", false, true);
    const devices = this.config.deviceList;
    this.log.info(`WLANThermo startet, loading ${devices.length} devices`);
    let amountConnected = 0;
    for (const device in devices) {
      activeDevices[devices[device].ip] = {};
      activeDevices[devices[device].ip].basicInfo = devices[device];
      activeDevices[devices[device].ip].initialised = false;
      await this.getDeviceData(devices[device].ip);
      if (activeDevices[devices[device].ip].initialised) {
        amountConnected = amountConnected + 1;
      }
    }
    initializing = false;
    this.log.info(`WLANThermo ready, ${amountConnected} device(s) connected`);
    this.setState("info.connection", true, true);
  }
  async getDeviceData(deviceIP) {
    try {
      if (activeDevices[deviceIP] == null || activeDevices[deviceIP].deviceURL == null || !activeDevices[deviceIP].initialised) {
        await this.initialiseDevice(deviceIP);
      } else {
        const response_deviceData = await (0, import_axios.default)(activeDevices[deviceIP].deviceURL + "/data", { timeout: 5e3 });
        activeDevices[deviceIP].data = response_deviceData.data;
        const serial = activeDevices[deviceIP].settings.device.serial;
        for (const i in activeDevices[deviceIP].data.system) {
          const value = activeDevices[deviceIP].data.system[i];
          await this.setObjectAndState(`${serial}.Configuration`, `${i}`, value);
        }
        const channel = activeDevices[deviceIP].data.channel;
        for (const i in channel) {
          const sensorRoot = `${serial}.Sensors.Sensor_${1 + parseInt(i)}`;
          await this.setObjectNotExistsAsync(sensorRoot, {
            type: "channel",
            common: {
              name: channel[i].name
            },
            native: {}
          });
          const sensorTypes = [];
          for (const sensor in activeDevices[deviceIP].settings.sensors) {
            sensorTypes.push(activeDevices[deviceIP].settings.sensors[sensor].name);
          }
          for (const y in channel[i]) {
            switch (y) {
              case "typ":
                await this.setObjectNotExistsAsync(`${sensorRoot}.${y}`, {
                  type: "state",
                  common: {
                    name: y,
                    role: "switch.mode",
                    read: true,
                    type: "number",
                    write: true,
                    states: sensorTypes,
                    def: 0
                  },
                  native: {}
                });
                this.setState(`${sensorRoot}.${y}`, { val: channel[i][y], ack: true });
                break;
              case "alarm":
                await this.setObjectNotExistsAsync(`${sensorRoot}.${y}`, {
                  type: "state",
                  common: {
                    name: y,
                    role: "indicator.alarm",
                    read: true,
                    type: "number",
                    write: false,
                    states: {
                      "0": "Disabled",
                      "1": "Push-Only",
                      "2": "Speaker-Only",
                      "4": "Push & Speaker"
                    },
                    def: 0
                  },
                  native: {}
                });
                this.setState(`${sensorRoot}.${y}`, { val: channel[i][y], ack: true });
                break;
              case "temp":
                await this.setObjectAndState(`${sensorRoot}`, `${y}`, null);
                if (channel[i][y] !== 999) {
                  this.setState(`${sensorRoot}.${y}`, {
                    val: channel[i][y],
                    ack: true,
                    expire: activeDevices[deviceIP].basicInfo.interval * 2e3
                  });
                } else {
                  this.setState(`${sensorRoot}.${y}`, { val: null, ack: true });
                }
                break;
              default:
                await this.setObjectAndState(`${sensorRoot}`, `${y}`, channel[i][y]);
            }
          }
        }
        const pitmaster = activeDevices[deviceIP].data.pitmaster;
        for (const i in pitmaster.pm) {
          const stateRoot = `${serial}.Pitmaster.Pitmaster_${1 + parseInt(i)}`;
          await this.setObjectNotExistsAsync(stateRoot, {
            type: "channel",
            common: {
              name: "Pitmaster"
            },
            native: {}
          });
          for (const y in pitmaster.pm[i]) {
            if (y === "typ") {
              await this.setObjectAndState(`${stateRoot}`, `modus`, pitmaster.pm[i][y]);
              this.subscribeStates(`${stateRoot}.modus`);
            } else if (y === "pid") {
              await this.setObjectAndState(`${stateRoot}`, `${y}`, pitmaster.pm[i][y]);
              this.subscribeStates(`${stateRoot}.${y}`);
            } else if (y === "set_color") {
            } else if (y === "value_color") {
            } else {
              await this.setObjectAndState(`${stateRoot}`, `${y}`, pitmaster.pm[i][y]);
            }
          }
        }
        this.setState(`${activeDevices[deviceIP].settings.device.serial}.Info.connected`, {
          val: true,
          ack: true
        });
      }
    } catch (e) {
      console.error(e);
      if (activeDevices[deviceIP].initialised) {
        this.log.warn(`${deviceIP} Connection lost, will try to reconnect`);
      }
      activeDevices[deviceIP].initialised = false;
      try {
        this.setState(`${activeDevices[deviceIP].settings.device.serial}.Info.connected`, {
          val: false,
          ack: true
        });
      } catch (e2) {
        console.error(e2);
      }
    }
    if (polling[deviceIP]) {
      clearTimeout(polling[deviceIP]);
      polling[deviceIP] = {};
    }
    polling[deviceIP] = setTimeout(() => {
      this.getDeviceData(deviceIP);
    }, activeDevices[deviceIP].basicInfo.interval * 1e3);
  }
  async initialiseDevice(ip) {
    try {
      const device = activeDevices[ip].basicInfo;
      const url = `http://${device.username}:${device.password}@${device.ip}`;
      const response_settings = await (0, import_axios.default)(url + "/settings", { timeout: 5e3 });
      if (response_settings == null || response_settings.data == null)
        return;
      const responseData = response_settings.data;
      activeDevices[device.ip].deviceURL = url;
      activeDevices[device.ip].settings = responseData;
      activeDevices[device.ip].initialised = true;
      await this.deviceStructures(activeDevices[device.ip].settings.device.serial, device.ip);
      for (const i in response_settings.data.device) {
        await this.setObjectAndState(`${activeDevices[device.ip].settings.device.serial}.Info`, `${i}`, `${response_settings.data.device[i]}`);
      }
      this.log.info(`${ip} Connected, refreshing data every ${activeDevices[device.ip].basicInfo.interval} seconds`);
      this.getDeviceData(ip);
    } catch (e) {
      console.error(e);
      if (initializing) {
        this.log.warn(`${ip} Connection failed, will try again later ${e}`);
      }
      activeDevices[ip].initialised = false;
    }
  }
  async deviceStructures(serial, ip) {
    try {
      this.createDevice(serial, {
        name: activeDevices[ip].settings.system.host
      });
      for (const object in import_stateDefinitions.BasicStates) {
        await this.setObjectAndState(`${serial}`, `${object}`, null);
      }
    } catch (e) {
      console.error(e);
    }
  }
  async setObjectAndState(rootDIR, stateName, value) {
    try {
      let obj = import_stateDefinitions.BasicStates[stateName];
      if (!obj) {
        obj = (0, import_stateDefinitions.buildCommon)(stateName);
      }
      if (createdObjs.indexOf(`${rootDIR}.${stateName}`) === -1) {
        await this.setObjectNotExistsAsync(`${rootDIR}.${stateName}`, {
          type: obj.type,
          common: JSON.parse(JSON.stringify(obj.common)),
          native: JSON.parse(JSON.stringify(obj.native))
        });
        createdObjs.push(`${rootDIR}.${stateName}`);
      }
      if (value != null) {
        await this.setStateChangedAsync(`${rootDIR}.${stateName}`, {
          val: value,
          ack: true
        });
      }
    } catch (e) {
      console.error(e);
    }
  }
  onUnload(callback) {
    try {
      for (const device in activeDevices) {
        if (polling[device]) {
          clearTimeout(polling[device]);
          polling[device] = {};
        }
        this.setState(`${activeDevices[device].settings.device.serial}.Info.connected`, {
          val: false,
          ack: true
        });
      }
      callback();
    } catch (e) {
      callback();
    }
  }
  onStateChange(id, state) {
    if (state) {
    } else {
      this.log.info(`state ${id} deleted`);
    }
  }
}
if (require.main !== module) {
  module.exports = (options) => new WlanthermoNano(options);
} else {
  (() => new WlanthermoNano())();
}
//# sourceMappingURL=main.js.map
