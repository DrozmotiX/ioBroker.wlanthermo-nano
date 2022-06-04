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
const ipSerialMapping = {};
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
    this.log.debug(`Configured  devices ${devices}`);
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
        this.log.debug(`${deviceIP} not initialised, try to connect`);
        await this.initialiseDevice(deviceIP);
      } else {
        this.log.debug(`${deviceIP} initialised, update data`);
        const response_deviceData = await (0, import_axios.default)(activeDevices[deviceIP].deviceURL + "/data", { timeout: 5e3 });
        activeDevices[deviceIP].data = response_deviceData.data;
        this.log.debug(`${deviceIP} data | ${JSON.stringify(response_deviceData.data)}`);
        const serial = activeDevices[deviceIP].settings.device.serial;
        for (const [key, value] of Object.entries(activeDevices[deviceIP].data.system)) {
          this.log.debug(`Create configuration state ${serial}.Configuration.${key} | ${value}`);
          await this.setObjectAndState(`${serial}.Configuration`, `${key}`, value);
        }
        const channel = activeDevices[deviceIP].data.channel;
        for (let i = 0; i < channel.length; i++) {
          const sensorRoot = `${serial}.Sensors.Sensor_${1 + +i}`;
          this.log.debug(`Create sensor states ${sensorRoot}`);
          await this.setObjectNotExistsAsync(sensorRoot, {
            type: "channel",
            common: {
              name: channel[i].name
            },
            native: {}
          });
          const sensorTypes = {};
          for (const sensor in activeDevices[deviceIP].settings.sensors) {
            sensorTypes[sensor] = activeDevices[deviceIP].settings.sensors[sensor].name;
          }
          for (const [key, value] of Object.entries(channel[i])) {
            switch (key) {
              case "typ":
                await this.setObjectAndState(`${sensorRoot}`, `${key}`, value, sensorTypes);
                this.subscribeStates(`${sensorRoot}.${key}`);
                break;
              case "alarm":
                await this.setObjectAndState(`${sensorRoot}`, `${key}`, value, {
                  "0": "Disabled",
                  "1": "Push-Only",
                  "2": "Speaker-Only",
                  "4": "Push & Speaker"
                });
                break;
              case "temp":
                await this.setObjectAndState(`${sensorRoot}`, `${key}`, null);
                if (channel[i][key] !== 999) {
                  this.setState(`${sensorRoot}.${key}`, {
                    val: channel[i][key],
                    ack: true,
                    expire: activeDevices[deviceIP].basicInfo.interval * 2e3
                  });
                } else {
                  this.setState(`${sensorRoot}.${key}`, { val: null, ack: true });
                }
                break;
              default:
                await this.setObjectAndState(`${sensorRoot}`, `${key}`, value);
                this.subscribeStates(`${sensorRoot}.${key}`);
            }
          }
          const pitmaster = activeDevices[deviceIP].data.pitmaster;
          for (let i2 = 0; i2 < pitmaster.pm.length; i2++) {
            const stateRoot = `${serial}.Pitmaster.Pitmaster_${1 + i2}`;
            this.log.debug(`Create Pitmaster states ${stateRoot}`);
            await this.setObjectNotExistsAsync(stateRoot, {
              type: "channel",
              common: {
                name: "Pitmaster"
              },
              native: {}
            });
            for (const [key, value] of Object.entries(pitmaster.pm[i2])) {
              if (key === "typ") {
                await this.setObjectAndState(`${stateRoot}`, `modus`, value);
              } else if (key === "pid") {
                await this.setObjectAndState(`${stateRoot}`, `${key}`, value);
              } else if (key === "id") {
                const pidProfiles = {};
                for (const profile in activeDevices[deviceIP].settings.pid) {
                  pidProfiles[profile] = activeDevices[deviceIP].settings.pid[profile].name;
                }
                await this.setObjectAndState(`${stateRoot}`, `${key}`, value, pidProfiles);
              } else {
                await this.setObjectAndState(`${stateRoot}`, `${key}`, value);
              }
            }
          }
          this.setState(`${activeDevices[deviceIP].settings.device.serial}.Info.connected`, {
            val: true,
            ack: true
          });
        }
      }
    } catch (e) {
      this.log.debug(`[getDeviceData] ${e}`);
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
    this.log.debug(`${deviceIP} Timer triggered`);
    polling[deviceIP] = setTimeout(() => {
      this.log.debug(`${deviceIP} Timer executed`);
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
      this.log.debug(`${ip} data | ${JSON.stringify(response_settings.data)}`);
      const responseData = response_settings.data;
      activeDevices[device.ip].deviceURL = url;
      activeDevices[device.ip].settings = responseData;
      activeDevices[device.ip].initialised = true;
      ipSerialMapping[activeDevices[device.ip].settings.device.serial] = { ip: device.ip };
      this.log.debug(`${ip} memory cache | ${JSON.stringify(activeDevices[device.ip])}`);
      await this.deviceStructures(activeDevices[device.ip].settings.device.serial, device.ip);
      for (const i in response_settings.data.device) {
        this.log.debug(`Create device settings state ${activeDevices[device.ip].settings.device.serial}.Info.${i} | ${response_settings.data.device[i]}`);
        await this.setObjectAndState(`${activeDevices[device.ip].settings.device.serial}.Info`, `${i}`, `${response_settings.data.device[i]}`);
      }
      for (const [key, value] of Object.entries(activeDevices[device.ip].settings.features)) {
        this.log.debug(`Create feature state ${activeDevices[device.ip].settings.device.serial}.features.${key} | ${value}`);
        await this.setObjectAndState(`${activeDevices[device.ip].settings.device.serial}.Features`, `${key}`, value);
      }
      const pidProfile = activeDevices[device.ip].settings.pid;
      for (let i = 0; i < pidProfile.length; i++) {
        const sensorRoot = `${activeDevices[device.ip].settings.device.serial}.Pitmaster.Profiles.Profile_${1 + +i}`;
        this.log.debug(`Create profile states ${sensorRoot}`);
        await this.setObjectNotExistsAsync(sensorRoot, {
          type: "channel",
          common: {
            name: pidProfile[i].name
          },
          native: {}
        });
        for (const [key, value] of Object.entries(pidProfile[i])) {
          await this.setObjectAndState(`${sensorRoot}`, `${key}`, value);
          this.subscribeStates(`${sensorRoot}.${key}`);
        }
      }
      this.log.info(`${ip} Connected, refreshing data every ${activeDevices[device.ip].basicInfo.interval} seconds`);
      this.getDeviceData(ip);
    } catch (e) {
      this.log.debug(`[initialiseDevice] ${e}`);
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
        this.log.debug(`Create basic state ${serial}.${object}`);
        await this.setObjectAndState(`${serial}`, `${object}`, null);
      }
    } catch (e) {
      this.log.error(`[deviceStructures] ${e}`);
      this.sendSentry(`[deviceStructures] ${e}`);
    }
  }
  async setObjectAndState(rootDIR, stateName, value, stateDropDown) {
    try {
      let obj = import_stateDefinitions.BasicStates[stateName];
      if (!obj) {
        obj = (0, import_stateDefinitions.buildCommon)(stateName);
      }
      if (stateDropDown != null) {
        obj.common.states = stateDropDown;
      }
      if (createdObjs.indexOf(`${rootDIR}.${stateName}`) === -1) {
        await this.extendObjectAsync(`${rootDIR}.${stateName}`, {
          type: obj.type,
          common: JSON.parse(JSON.stringify(obj.common)),
          native: JSON.parse(JSON.stringify(obj.native))
        });
        createdObjs.push(`${rootDIR}.${stateName}`);
      }
      if (obj.common.write != null && obj.common.write) {
        this.subscribeStates(`${rootDIR}.${stateName}`);
      }
      if (value != null) {
        await this.setStateChangedAsync(`${rootDIR}.${stateName}`, {
          val: value,
          ack: true
        });
      }
    } catch (e) {
      this.log.error(`[setObjectAndState] ${e}`);
      this.sendSentry(`[setObjectAndState] ${e}`);
    }
  }
  onUnload(callback) {
    try {
      for (const device in activeDevices) {
        if (polling[device]) {
          clearTimeout(polling[device]);
          polling[device] = {};
        }
        if (`${activeDevices[device]}` != null && `${activeDevices[device].settings}` != null) {
          this.setState(`${activeDevices[device].settings.device.serial}.Info.connected`, {
            val: false,
            ack: true
          });
        }
      }
      callback();
    } catch (e) {
      this.log.error(`[onUnload] ${e}`);
      this.sendSentry(`[onUnload] ${e} | DeviceMemory ${activeDevices}`);
      callback();
    }
  }
  async onStateChange(id, state) {
    try {
      if (state) {
        this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        if (!state.ack && state.val != null) {
          this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
          const deviceId = id.split(".");
          const deviceIP = ipSerialMapping[deviceId[2]].ip;
          const url = activeDevices[deviceIP].deviceURL;
          this.log.debug("Triggered state : " + deviceId[3]);
          if (deviceId[3] === "Configuration") {
            if (deviceId[4] === "restart") {
              const post_url = `${url}/restart`;
              const response = await import_axios.default.post(post_url);
              this.setState(`${id}`, { val: false, ack: true });
              this.log.info(`${deviceIP} Restart requested ${response.status}, reconnecting device`);
              activeDevices[deviceIP].initialised = false;
            } else if (deviceId[4] === "checkupdate") {
              const post_url = `${url}/checkupdate`;
              const response = await import_axios.default.post(post_url);
              this.setState(`${id}`, { val: false, ack: true });
              this.log.info(`${deviceIP} Check for updates ${response.status}`);
            } else if (deviceId[4] === "update") {
              const post_url = `${url}/update`;
              const response = await import_axios.default.post(post_url);
              this.setState(`${id}`, { val: false, ack: true });
              this.log.info(`${deviceIP} Device update requested ${response.status}`);
            } else {
              this.log.info(`${deviceIP} Device configuration changed ${deviceId[4]} ${deviceId[5]} | ${state.val}, reconnecting device`);
              activeDevices[deviceIP].settings.system[deviceId[5]] = state.val;
              const array = {
                ap: activeDevices[deviceIP].settings.system.ap,
                host: activeDevices[deviceIP].settings.system.host,
                language: activeDevices[deviceIP].settings.system.language,
                unit: activeDevices[deviceIP].settings.system.unit,
                autoupd: activeDevices[deviceIP].settings.system.autoupd,
                hwversion: activeDevices[deviceIP].settings.system.hwversion
              };
              this.sendArray(url, array, "/setsystem");
              activeDevices[deviceIP].initialised = false;
              await this.getDeviceData(deviceIP);
            }
          } else if (deviceId[3] === "Sensors") {
            const sensorID = parseInt(deviceId[4].replace("Sensor_", "")) - 1;
            const currentSensor = activeDevices[deviceIP].data.channel[sensorID];
            currentSensor[deviceId[5]] = state.val;
            this.log.info(`${deviceIP} Sensor configuration changed ${deviceId[4]} ${deviceId[5]} | ${state.val}`);
            await this.sendArray(url, activeDevices[deviceIP].data.channel[sensorID], "/setchannels");
            await this.getDeviceData(deviceIP);
          } else if (deviceId[3] === "Pitmaster") {
            try {
              if ([deviceId[4]].toString() === "Profiles") {
                if (deviceId[6].toString() === "id")
                  return;
                const profileID = parseInt(deviceId[5].replace("Profile_", "")) - 1;
                const currentProfiles = activeDevices[deviceIP].settings.pid;
                currentProfiles[profileID][deviceId[6]] = state.val;
                this.sendArray(url, currentProfiles, "/setpid");
                this.log.info(`${deviceIP} Pitmaster profile changed ${deviceId[5]} ${deviceId[6]} | ${state.val}, reconnecting device`);
                activeDevices[deviceIP].initialised = false;
                await this.getDeviceData(deviceIP);
              } else {
                this.log.info(`${deviceIP} Pitmaster configuration changed ${deviceId[4]} ${deviceId[5]} | ${state.val}`);
                const pitmasterID = parseInt(deviceId[4].replace("Pitmaster_", "")) - 1;
                const currentPM = activeDevices[deviceIP].data.pitmaster.pm[pitmasterID];
                if ([deviceId[5]].toString() !== "modus") {
                  currentPM[deviceId[5]] = state.val;
                } else {
                  currentPM.typ = state.val.toString();
                }
                this.sendArray(url, activeDevices[deviceIP].data.pitmaster.pm, "/setpitmaster");
                await this.getDeviceData(deviceIP);
              }
            } catch (e) {
              this.log.error("Error in handling pitmaster state change" + e);
            }
          }
        }
      } else {
        this.log.debug(`state ${id} deleted`);
      }
    } catch (e) {
      this.log.error(`[onStateChange] ${e}`);
      this.sendSentry(`[onStateChange] ${e}`);
    }
  }
  async sendArray(url, array, type) {
    try {
      this.log.debug(`Send array ${type} ${JSON.stringify(array)}`);
      if (url == null)
        return;
      const post_url = `${url}${type}`;
      const respons = import_axios.default.post(post_url, array);
      return respons;
    } catch (e) {
      this.log.error(`[sendArray] ${e}`);
      this.sendSentry(`[sendArray] ${e}`);
    }
  }
  sendSentry(error) {
    if (this.supportsFeature && this.supportsFeature("PLUGINS")) {
      const sentryInstance = this.getPluginInstance("sentry");
      if (sentryInstance) {
        sentryInstance.getSentryObject().captureException(error);
      }
    }
  }
}
if (require.main !== module) {
  module.exports = (options) => new WlanthermoNano(options);
} else {
  (() => new WlanthermoNano())();
}
//# sourceMappingURL=main.js.map
