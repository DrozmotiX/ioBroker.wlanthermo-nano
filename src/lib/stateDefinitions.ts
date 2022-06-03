type MyObjects = Record<string, MyObjectsDefinitions>;
type StateAttr = {
	[key: string]: {
		def?: boolean | string | number | null;
		name?: string;
		states?: object;
		type: ioBroker.CommonType;
		role: string;
		/** Unit of the state */
		unit?: string;
		/** if this state is writable */
		write?: boolean;
	};
};

interface MyObjectsDefinitions extends Omit<ioBroker.BaseObject, '_id'> {
	common: MyStateCommon;
}

interface MyStateCommon extends Partial<ioBroker.StateCommon> {
	name?: string;
}

const stateAttrb: StateAttr = {
	alarm: {
		type: 'boolean',
		role: 'sensor.alarm',
		write: true,
	},
	ap: {
		type: 'mixed',
		role: 'info',
		write: true,
	},
	api_version: {
		type: 'string',
		role: 'info.api_version',
	},
	autoupd: {
		type: 'boolean',
		role: 'info.status',
		write: true,
	},
	channel: {
		type: 'number',
		role: 'info.channel',
	},
	color: {
		type: 'string',
		role: 'level.color.rgb',
		write: true,
	},
	cpu: {
		type: 'mixed',
		role: 'value',
	},
	flash_size: {
		type: 'number',
		role: 'value',
	},
	prerelease: {
		type: 'mixed',
		role: 'value',
	},
	fixed: {
		type: 'mixed',
		role: 'value',
	},
	typ_last: {
		type: 'mixed',
		role: 'value',
	},
	connected: {
		type: 'boolean',
		role: 'info.connected',
	},
	device: {
		type: 'mixed',
		role: 'info.device',
	},
	god: {
		type: 'number',
		role: 'info',
	},
	host: {
		type: 'mixed',
		role: 'info.hostname',
		write: true,
	},
	hw_version: {
		type: 'mixed',
		role: 'info.hw_version',
	},
	hwversion: {
		type: 'mixed',
		role: 'info.hw_version',
	},
	item: {
		type: 'mixed',
		role: 'info.item',
	},
	id: {
		type: 'number',
		role: 'info.id',
	},
	getupdate: {
		type: 'mixed',
		role: 'info.status',
	},
	language: {
		type: 'mixed',
		role: 'info.language',
	},
	max: {
		type: 'number',
		role: 'value.max',
		unit: '°C',
		write: true,
	},
	min: {
		type: 'number',
		role: 'value.min',
		unit: '°C',
		write: true,
	},
	modus: {
		def: 0,
		type: 'number',
		role: 'switch.mode',
		write: true,
		states: {
			off: 'off',
			manual: 'manual',
			auto: 'auto',
		},
	},
	name: {
		type: 'mixed',
		role: 'info.name',
		write: true,
	},
	number: {
		type: 'number',
		role: 'value',
	},
	pid: {
		type: 'number',
		role: 'info.pid',
		write: true,
		states: {
			'0': 'SSR SousVide"',
			'1': 'TITAN 50x50',
			'2': 'Kamado 50x50',
		},
		def: 0,
	},
	serial: {
		type: 'mixed',
		role: 'info.serial',
	},
	set: {
		type: 'number',
		role: 'value',
		unit: 'C',
		write: true,
	},
	set_color: {
		type: 'mixed',
		role: 'level.color.rgb',
		write: true,
	},
	sw_version: {
		type: 'mixed',
		role: 'info.sw_version',
	},
	temp: {
		name: 'Temperature',
		role: 'value.temperature ',
		unit: '°C',
		type: 'number',
		def: null,
	},
	time: {
		type: 'mixed',
		role: 'value.time',
	},
	typ: {
		type: 'mixed',
		role: 'info.typ',
		write: true,
	},
	unit: {
		type: 'mixed',
		role: 'info.unit',
		write: true,
	},
	value: {
		type: 'number',
		role: 'value',
		write: true,
	},
	value_color: {
		type: 'mixed',
		role: 'level.color.rgb',
	},
	version: {
		type: 'mixed',
		role: 'info.version',
	},
};

const BasicStates: MyObjects = {
	Configuration: {
		type: 'channel',
		common: {
			name: 'Configuration',
		},
		native: {},
	},
	Info: {
		type: 'channel',
		common: {
			name: 'Information',
		},
		native: {},
	},
	Sensors: {
		type: 'channel',
		common: {
			name: 'Information',
		},
		native: {},
	},
	'Configuration.checkupdate': {
		type: 'state',
		common: {
			name: 'Check for updates',
			type: 'boolean',
			read: true,
			write: true,
			role: 'button',
			def: false,
		},
		native: {},
	},
	'Configuration.restart': {
		type: 'state',
		common: {
			name: 'Restart Device',
			type: 'boolean',
			read: true,
			write: true,
			role: 'button',
			def: false,
		},
		native: {},
	},
	'Configuration.update': {
		type: 'state',
		common: {
			name: 'Execute update',
			type: 'boolean',
			read: true,
			write: true,
			role: 'button',
			def: false,
		},
		native: {},
	},
	'Info.connected': {
		type: 'state',
		common: {
			name: 'Device connected',
			type: 'boolean',
			read: true,
			write: false,
			role: 'info.connected',
			def: false,
		},
		native: {},
	},
};

function buildCommon(stateName: string): MyObjectsDefinitions {
	const obj: MyObjectsDefinitions = {
		type: 'state',
		common: {
			name: stateName,
			type: 'mixed',
			read: true,
			write: false,
			role: 'state',
		},
		native: {},
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

export { stateAttrb, BasicStates, MyObjectsDefinitions, buildCommon, MyObjects };
