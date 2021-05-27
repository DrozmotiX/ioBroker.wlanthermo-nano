// Classification of all state attributes possible
const stateAttrb = {
	'alarm' : {
		type: 'boolean',
		role: 'sensor.alarm',
		write: true,
	},
	'ap' : {
		type: 'mixed',
		role: 'info',
		write: true,
	},
	'api_version' : {
		type: 'number',
		role: 'info.api_version',
	},
	'autoupd' : {
		type: 'bolean',
		role: 'info.status',	
		write: true,
	},
	'channel' : {
		type: 'number',
		role: 'info.channel',
	},
	'color' : {
		type: 'number',
		role: 'level.color.rgb',
		write: true,
	},
	'device' : {
		type: 'mixed',
		role: 'info.device',		
	},
	'god'  : {
		type: 'number',
		role: 'info',		
	},
	'host'  : {
		type: 'mixed',
		role: 'info.hostname',
		write: true,
	},
	'hw_version' : {
		type: 'mixed',
		role: 'info.hw_version',
	},
	'hwversion' : {
		type: 'mixed',
		role: 'info.hw_version',		
	},
	'item' : {
		type: 'mixed',
		role: 'info.item',		
	},
	'id' : {
		type: 'number',
		role: 'info.id',		
	},
	'getupdate' : {
		type: 'mixed',
		role: 'info.status',		
	},
	'language' : {
		type: 'mixed',
		role: 'info.language',		
	},
	'max' : {
		type: 'number',
		role: 'value.max',
		unit: '°C' ,
		write: true,
	},
	'min': {
		type: 'number',
		role: 'value.min',
		unit: '°C',
		write: true,
	},
	'name' : {
		type: 'mixed',
		role: 'info.name',
		write: true,
	},
	'number'  :  {
		type: 'number',
		role: 'value',		
	},
	'pid' : {
		type: 'number',
		role: 'info.pid',
		write: true,
	},
	'serial' : {
		type: 'mixed',
		role: 'info.serial',		
	},
	'set': {
		type: 'number',
		role: 'value',
		unit: 'unit_device',
		write: true,
	},
	'set_color' : {
		type: 'mixed',
		role: 'level.color.rgb',
		write: true,
	},
	'sw_version' : {
		type: 'mixed',
		role: 'info.sw_version',
	},
	'temp' : {
		type: 'number',
		role: 'value.temperature',
		unit: '°C',
	},
	'time' : {
		type: 'mixed',
		role: 'value.time',		
	},
	'typ' : {
		type: 'mixed',
		role: 'info.typ',
		write: true,
	},
	'unit' : {
		type: 'mixed',
		role: 'info.unit',
		write: true,
	},
	'value' : {
		type: 'number',
		role: 'value',
		write: true,
	},
	'value_color' : {
		type: 'mixed',
		role: 'level.color.rgb',		
	},
	'version' : {
		type: 'mixed',
		role: 'info.version',		
	},
	'cpu' : {
		type: 'mixed',
		role: 'value'
	},
	'flash_size' : {
		type: 'number',
		role: 'value'
	},
	'prerelease' : {
		type: 'mixed',
		role: 'value'
	},
	'fixed' : {
		type: 'mixed',
		role: 'value'
	},
	'connected' : {
		type: 'mixed',
		role: 'value'
	},
	'typ_last' : {
		type: 'mixed',
		role: 'value'
	},
};


module.exports = stateAttrb;
