var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var stateDefinitions_exports = {};
__export(stateDefinitions_exports, {
  BasicStates: () => BasicStates,
  buildCommon: () => buildCommon,
  stateAttrb: () => stateAttrb
});
module.exports = __toCommonJS(stateDefinitions_exports);
const stateAttrb = {
  alarm: {
    type: "boolean",
    role: "sensor.alarm",
    write: true
  },
  ap: {
    type: "mixed",
    role: "info",
    write: true
  },
  api_version: {
    type: "string",
    role: "info.api_version"
  },
  autoupd: {
    type: "boolean",
    role: "info.status",
    write: true
  },
  channel: {
    type: "number",
    role: "info.channel"
  },
  color: {
    type: "string",
    role: "level.color.rgb",
    write: true
  },
  connected: {
    type: "boolean",
    role: "info.connected"
  },
  device: {
    type: "mixed",
    role: "info.device"
  },
  god: {
    type: "number",
    role: "info"
  },
  host: {
    type: "mixed",
    role: "info.hostname",
    write: true
  },
  hw_version: {
    type: "mixed",
    role: "info.hw_version"
  },
  hwversion: {
    type: "mixed",
    role: "info.hw_version"
  },
  item: {
    type: "mixed",
    role: "info.item"
  },
  id: {
    type: "number",
    role: "info.id"
  },
  getupdate: {
    type: "mixed",
    role: "info.status"
  },
  language: {
    type: "mixed",
    role: "info.language"
  },
  max: {
    type: "number",
    role: "value.max",
    unit: "\xB0C",
    write: true
  },
  min: {
    type: "number",
    role: "value.min",
    unit: "\xB0C",
    write: true
  },
  modus: {
    def: 0,
    type: "number",
    role: "switch.mode",
    write: true,
    states: {
      off: "off",
      manual: "manual",
      auto: "auto"
    }
  },
  name: {
    type: "mixed",
    role: "info.name",
    write: true
  },
  number: {
    type: "number",
    role: "value"
  },
  pid: {
    type: "number",
    role: "info.pid",
    write: true,
    states: {
      "0": 'SSR SousVide"',
      "1": "TITAN 50x50",
      "2": "Kamado 50x50"
    },
    def: 0
  },
  serial: {
    type: "mixed",
    role: "info.serial"
  },
  set: {
    type: "number",
    role: "value",
    unit: "unit_device",
    write: true
  },
  set_color: {
    type: "mixed",
    role: "level.color.rgb",
    write: true
  },
  sw_version: {
    type: "mixed",
    role: "info.sw_version"
  },
  temp: {
    name: "Temperature",
    role: "value.temperature ",
    unit: "\xB0C",
    type: "number",
    def: null
  },
  time: {
    type: "mixed",
    role: "value.time"
  },
  typ: {
    type: "mixed",
    role: "info.typ",
    write: true
  },
  unit: {
    type: "mixed",
    role: "info.unit",
    write: true
  },
  value: {
    type: "number",
    role: "value",
    write: true
  },
  value_color: {
    type: "mixed",
    role: "level.color.rgb"
  },
  version: {
    type: "mixed",
    role: "info.version"
  }
};
const BasicStates = {
  Configuration: {
    type: "channel",
    common: {
      name: "Configuration"
    },
    native: {}
  },
  Info: {
    type: "channel",
    common: {
      name: "Information"
    },
    native: {}
  },
  Sensors: {
    type: "channel",
    common: {
      name: "Information"
    },
    native: {}
  },
  "Configuration.checkupdate": {
    type: "state",
    common: {
      name: "Check for updates",
      type: "boolean",
      read: true,
      write: true,
      role: "button",
      def: false
    },
    native: {}
  },
  "Configuration.restart": {
    type: "state",
    common: {
      name: "Restart Device",
      type: "boolean",
      read: true,
      write: true,
      role: "button",
      def: false
    },
    native: {}
  },
  "Configuration.update": {
    type: "state",
    common: {
      name: "Execute update",
      type: "boolean",
      read: true,
      write: true,
      role: "button",
      def: false
    },
    native: {}
  },
  "Info.connected": {
    type: "state",
    common: {
      name: "Device connected",
      type: "boolean",
      read: true,
      write: false,
      role: "info.connected",
      def: false
    },
    native: {}
  }
};
function buildCommon(stateName) {
  const obj = {
    type: "state",
    common: {
      name: stateName,
      type: "mixed",
      read: true,
      write: false,
      role: "state"
    },
    native: {}
  };
  if (stateAttrb[stateName] != null) {
    if (stateAttrb[stateName].def != null) {
      obj.common.def = stateAttrb[stateName].def;
    }
    if (stateAttrb[stateName].name != null) {
      obj.common.name = stateAttrb[stateName].name;
    }
    if (stateAttrb[stateName].unit != null) {
      obj.common.unit = stateAttrb[stateName].unit;
    }
    obj.common.role = stateAttrb[stateName].role;
    obj.common.type = stateAttrb[stateName].type;
    if (stateAttrb[stateName].write != null) {
      obj.common.write = stateAttrb[stateName].write;
    }
  }
  return obj;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BasicStates,
  buildCommon,
  stateAttrb
});
//# sourceMappingURL=stateDefinitions.js.map
