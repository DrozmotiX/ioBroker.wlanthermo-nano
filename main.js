'use strict';

/*
 * Created with @iobroker/create-adapter v1.16.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter

// Load your modules here, e.g.:
const utils = require('@iobroker/adapter-core');
const state_attr = require(__dirname + '/lib/state_attr.js');
const axios = require('axios');

let data, settings, unit_device, intervall, initialise, user, pass; // , info, networklist; ==> these options from APi are currenlty not used

class WlanthermoNano extends utils.Adapter {

	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: 'wlanthermo-nano',
		});
		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		// this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {

		this.log.info('startet, state refresh every ' + this.config.Time_Sync + ' seconds');

		// Read some required master configuration items
		user = this.config.Username;
		pass  = this.config.Password;

		this.log.debug('Encrypted Password : ' + pass);

		// Check if credentials are not empty
		if (user !== '' && pass !== ''){
			this.getForeignObject('system.config', (err, obj) => {
				if (obj && obj.native && obj.native.secret) {
				//noinspection JSUnresolvedVariable
					pass = this.decrypt(obj.native.secret, this.config.Password);
				} else {
				//noinspection JSUnresolvedVariable
					pass = this.decrypt('Zgfr56gFe87jJOM', this.config.Password);
				}

				// Set  initialise variable to ensure state creation is only handled once
				initialise = true;

				// Call update routine first time
				this.get_http();

				// Start intervall timer 
				const intervall_time = this.config.Time_Sync * 1000;
				intervall = setInterval( () => {
					this.get_http();
				}, intervall_time);

			});
		} else {
			this.log.error('*** Adapter deactivated, credentials missing in Adaptper Settings !!!  ***');
			this.setForeignState('system.adapter.' + this.namespace + '.alive', false);
		}

	}

	async get_http(){
		try {

			this.log.debug('Get http function started');
				
			const url = 'http://' + user + ':' + pass + '@' + this.config.IP + ':' + this.config.receive_port;
			this.log.debug('URL : ' + url);
			this.log.debug('URL build');
			const response_data = await axios(url + '/data');
			this.log.debug(response_data);
			data = response_data.data;	
			this.log.debug('Data from get_http function : ' + JSON.stringify(data));

			const response_settings = await axios(url + '/settings');
			settings = response_settings.data;
			this.log.debug('Settings from get_http function : ' + JSON.stringify(settings));			

			unit_device = '°' + settings.system.unit;

			// API present but information not interesting to be used, disabled
			// const response_info = await axios('http://91.40.191.99:9999/info');
			// info = response_info.data;
			// this.log.debug('Info from get_http function : ' + JSON.stringify(info));

			// const_response_networklist = await axios('http://91.40.191.99:9999/networklist');
			// networklist = response_networklist.data;
			// this.log.debug('Networklist from get_http function : ' + JSON.stringify(networklist));		

			await this.create_device();
			await this.create_states();

			// Set initialisation to be finalized
			initialise = false;

		} catch (e) {
			this.log.error('Unable to connect to device, please check IP / port / username and password !')
			this.log.error(e);
		}
	}

	async create_device(){
		if (initialise){ 
			this.createDevice(settings.device['serial'],{
				name: settings.system['host']
			});
			this.createChannel(settings.device['serial'],'Sensors');
			this.createChannel(settings.device['serial'],'Info');
			this.createChannel(settings.device['serial'],'Pitmaster');
		}
	}	

	async create_states(){
		
		// Read all info related settings and write to states

		// Create info channel
		for (const i in settings.device){

			await this.create_states_new(settings.device['serial'] + '.Info.', i);
			this.setState(settings.device['serial'] + '.Info.' + i,{ val: settings.device[i] ,ack: true });			
		}

		// Create system channels
		await this.setObjectNotExistsAsync(settings.device['serial'] + '.Configuration.restart', {
			type: 'state',
			common: {
				name: 'Restart Device',
				type: 'number',
				read: true,
				write: true,
				role: 'button',
			},
			native: {},
		});

		await this.setObjectNotExistsAsync(settings.device['serial'] + '.Configuration.checkupdate', {
			type: 'state',
			common: {
				name: 'Check for updates',
				type: 'number',
				read: true,
				write: true,
				role: 'button',
			},
			native: {},
		});
		
		await this.setObjectNotExistsAsync(settings.device['serial'] + '.Configuration.update', {
			type: 'state',
			common: {
				name: 'Execute update',
				type: 'number',
				read: true,
				write: true,
				role: 'button',
			},
			native: {},
		});

		// Subscribe  on system  channels 
		this.subscribeStates(settings.device['serial'] + '.Configuration.restart');
		this.subscribeStates(settings.device['serial'] + '.Configuration.checkupdate');
		this.subscribeStates(settings.device['serial'] + '.Configuration.update');

		for (const i in settings.system){

			// Get type values for state
			this.log.debug(i);				
			await this.create_states_new(settings.device['serial'] + '.Configuration.', i);

			// Write value to state
			this.setState(settings.device['serial'] + '.Configuration.' + i,{ val: settings.system[i] ,ack: true });
						
		}

		// Read all sensor related settings and write to states
		for (const i in data.channel) {

			if (initialise){ 
				await this.setObjectNotExistsAsync(settings.device['serial'] + '.Sensors.Sensor_' + (1 + parseInt(i)), {
					type: 'channel',
					common: {
						name: data.channel[i].name,
					},
					native: {},
				});
			}
			for (const y in data.channel[i]){

				if (y === 'typ'){

					if (initialise){ 
						await this.setObjectNotExistsAsync(settings.device['serial'] + '.Sensors.Sensor_' + (1 + parseInt(i)) + '.' + y, {
							type: 'state',
							common: {
								name: y,
								role: state_attr[y].role,
								read: state_attr[y].read,
								write: state_attr[y].write,
								'states': {
									'0': 'Maverick',
									'1': 'Fantast-Neu',
									'2': 'Fantast',
									'3': 'iGrill2',
									'4': 'ET-73',
									'5': 'Perfektion',
									'6': '50K',
									'7': 'Inkbird',
									'8': '100K6A1B',
									'9': 'Weber_6743',
									'10': 'Santos'
								},
								def: 0,
							},
							native: {},
						});
					}
					this.setState(settings.device['serial'] + '.Sensors.Sensor_' + (1 + parseInt(i)) + '.' + y,{ val: data.channel[i][y] ,ack: true });

				} else if (y === 'alarm') {

					if (initialise){ 
						await this.setObjectNotExistsAsync(settings.device['serial'] + '.Sensors.Sensor_' + (1 + parseInt(i)) + '.' + y, {
							type: 'state',
							common: {
								name: y,
								role: state_attr[y].role,
								read: state_attr[y].read,
								write: state_attr[y].write,
								'states': {
									'0': 'Disabled',
									'1': 'Push-Only',
									'2': 'Speaker-Only',
									'4': 'Push & Speaker'
								},
								def: 0,
							},
							native: {},
						});
					}
					this.setState(settings.device['serial'] + '.Sensors.Sensor_' + (1 + parseInt(i)) + '.' + y,{ val: data.channel[i][y] ,ack: true });

				} else {

					await this.create_states_new(settings.device['serial'] + '.Sensors.Sensor_' + (1 + parseInt(i)) + '.', y);

					this.setState(settings.device['serial'] + '.Sensors.Sensor_' + (1 + parseInt(i)) + '.' + y,{ val: data.channel[i][y] ,ack: true });
				}
			}	
		}

		// Read pidmaster values

		for (const i in data.pitmaster.pm){

			await this.setObjectNotExistsAsync(settings.device['serial'] + '.Pitmaster' + '.Pitmaster_' + (1 + parseInt(i)), {
				type: 'channel',
				common: {
					name: 'Pitmaster',
				},
				native: {},
			});
			this.log.debug(data.channel[i].name);

			for (const y in data.pitmaster.pm[i]){

				if (y === 'typ'){

					if (initialise){ 
						
						await this.setObjectNotExistsAsync(settings.device['serial']+ '.Pitmaster' + '.Pitmaster_' + (1 + parseInt(i)) + '.modus', {
							type: 'state',
							common: {
								name: 'modus',
								type: state_attr[y].type,
								role: state_attr[y].role,
								read: state_attr[y].read,
								write: state_attr[y].write,
								'states': {
									'off': 'off',
									'manual': 'manual',
									'auto': 'auto'
								},
								def: 0,
							},
							native: {},
						});

						// Subscribe on state  if writeable
						if (state_attr[y].write === true){
							this.subscribeStates(settings.device['serial'] + '.Pitmaster' + '.Pitmaster_' + (1 + parseInt(i)) + '.modus');
						}

					}
					this.setState(settings.device['serial']+ '.Pitmaster' + '.Pitmaster_' + (1 + parseInt(i)) + '.modus',{ val: data.pitmaster.pm[i][y] ,ack: true });
					
				} else if (y === 'pid'){

					if (initialise){ 
						
						await this.setObjectNotExistsAsync(settings.device['serial'] + '.Pitmaster' + '.Pitmaster_' + (1 + parseInt(i)) + '.' + y, {
							type: 'state',
							common: {
								name: y,
								type: state_attr[y].type,
								role: state_attr[y].role,
								read: state_attr[y].read,
								write: state_attr[y].write,
								'states': {
									'0': 'SSR SousVide"',
									'1': 'TITAN 50x50',
									'2': 'Kamado 50x50'
								},
								def: 0,
							},
							native: {},
						});

						// Subscribe on state  if writeable
						if (state_attr[y].write === true){
							this.subscribeStates(settings.device['serial'] + '.Pitmaster' + '.Pitmaster_' + (1 + parseInt(i)) + '.' + y);
						}

					}
					this.setState(settings.device['serial'] + '.Pitmaster' + '.Pitmaster_' + (1 + parseInt(i)) + '.' + y,{ val: data.pitmaster.pm[i][y] ,ack: true });
					
				} else if (y === 'set_color'){

					// ignore set_color

				} else if (y === 'value_color'){

					// ignore set_color

				} else {
				
					await this.create_states_new(settings.device['serial'] + '.Pitmaster' + '.Pitmaster_' + (1 + parseInt(i)) + '.', y);
					this.setState(settings.device['serial'] + '.Pitmaster' + '.Pitmaster_' + (1 + parseInt(i)) + '.' + y,{ val: data.pitmaster.pm[i][y] ,ack: true });
				}
			}
		}
	}

	async create_states_new(state_root, name){

		// Only handle state creation at initialisation, better routine to be defined later version > 0.3
		if (initialise){ 
			
			this.log.debug('Stateroot to handle = '  + state_root);
			this.log.debug('Channel from array = ' + name);

			let set_unit;
			let set_name;

			if (state_attr[name].name === undefined){
				set_name = name;
				this.log.debug('No name defined, using from APi');
			} else {
				set_name = state_attr[name].name;
				this.log.debug('Name defined, take  value from library');
			}
			if (state_attr[name].unit === undefined){
				set_unit = '';
				this.log.debug('No unit defined, set to zero');
			} else {
				set_unit = unit_device;
				this.log.debug('Unit defined, take  value from system setting');
			}

			// test attributes  from array
			const attr_array = {
				name: set_name,
				type: state_attr[name].type,
				role: state_attr[name].role,
				unit: set_unit,
				read: state_attr[name].read,
				write: state_attr[name].write,
			};

			this.log.debug(settings.device[name]);

			await this.setObjectNotExistsAsync(state_root + name, {
				type: 'state',
				common: attr_array,
				native: {},
			});

			if (state_attr[name].write === true){
				this.subscribeStates(state_root + name);
			}

		}

	}
	
	async define_state_att (state){

		let objekt = {};
		this.log.error('Define state att routine used');
		// Define which calculation factor must be used
		switch (state) {

			case 'alarm':
				this.log.debug('Case result : alarm');
				objekt = {
					type: 'boolean',
					role: 'sensor.alarm',
					unit: '',
					read: true,
					write: true,
				};
				break;

			case 'ap':
				this.log.debug('Case result : ap');
				objekt = {
					type: 'mixed',
					role: 'info',
					unit: '',
					read: true,
					write: true,
				};
				break;

			case 'api_version':
				this.log.debug('Case result : api_version');
				objekt = {
					type: 'number',
					role: 'info.api_version',
					unit: '',
					read: true,
					write: false,
				};
				break;

			case 'autoupd':
				this.log.debug('Case result : autoupd');
				objekt = {
					type: 'bolean',
					role: 'info.status',
					unit: '',
					read: true,
					write: true,
				};
				break;

			case 'channel':
				this.log.debug('Case result : channel');
				objekt = {
					type: 'number',
					role: 'info.channel',
					unit: '',
					read: true,
					write: false,
				};
				break;
				
			case 'color':
				this.log.debug('Case result : color');
				objekt = {
					type: 'number',
					role: 'level.color.rgb',
					unit: '',
					read: true,
					write: true,
				};
				break;

			case 'device':
				this.log.debug('Case result : device');
				objekt = {
					type: 'mixed',
					role: 'info.device',
					unit: '',
					read: true,
					write: false,
				};
				break;

			case 'god':
				this.log.debug('Case result : god');
				objekt = {
					type: 'number',
					role: 'info',
					unit: '',
					read: true,
					write: false,
				};
				break;

			case 'host':
				this.log.debug('Case result : host');
				objekt = {
					type: 'mixed',
					role: 'info.hostname',
					unit: '',
					read: true,
					write: true,
				};
				break;

			case 'hw_version':
				this.log.debug('Case result : hw_version');
				objekt = {
					type: 'mixed',
					role: 'info.hw_version',
					unit: '',
					read: true,
					write: false,
				};
				break;

			case 'hwversion':
				this.log.debug('Case result : hwversion');
				objekt = {
					type: 'mixed',
					role: 'info.hw_version',
					unit: '',
					read: true,
					write: false,
				};
				break;

			case 'item':
				this.log.debug('Case result : item');
				objekt = {
					type: 'mixed',
					role: 'info.item',
					unit: '',
					read: true,
					write: false,
				};
				break;

			case 'id':
				this.log.debug('Case result : id');
				objekt = {
					type: 'number',
					role: 'info.id',
					unit: '',
					read: true,
					write: false,
				};
				break;

			case 'getupdate':
				this.log.debug('Case result : getupdate');
				objekt = {
					type: 'mixed',
					role: 'info.status',
					unit: '',
					read: true,
					write: false,
				};
				break;

			case 'language':
				this.log.debug('Case result : language');
				objekt = {
					type: 'mixed',
					role: 'info.language',
					unit: '',
					read: true,
					write: false,
				};
				break;

			case 'max':
				this.log.debug('Case result : max');
				objekt = {
					type: 'number',
					role: 'value.max',
					unit: unit_device,
					read: true,
					write: true,
				};
				break;

			case 'min':
				this.log.debug('Case result : min');
				objekt = {
					type: 'number',
					role: 'value.min',
					unit: unit_device,
					read: true,
					write: true,
				};
				break;

			case 'name':
				this.log.debug('Case result : name');
				objekt = {
					type: 'mixed',
					role: 'info.name',
					unit: '',
					read: true,
					write: true,
				};
				break;

			case 'number':
				this.log.debug('Case result : number');
				objekt = {
					type: 'number',
					role: 'value',
					unit: '',
					read: true,
					write: false,
				};
				break;

			case 'pid':
				this.log.debug('Case result : pid');
				objekt = {
					type: 'number',
					role: 'info.pid',
					unit: '',
					read: true,
					write: true,
				};
				break;

			case 'serial':
				this.log.debug('Case result : serial');
				objekt = {
					type: 'mixed',
					role: 'info.serial',
					unit: '',
					read: true,
					write: false,
				};
				break;

			case 'set':
				this.log.debug('Case result : set');
				objekt = {
					type: 'number',
					role: 'value',
					unit: unit_device,
					read: true,
					write: true,
				};
				break;

			case 'set_color':
				this.log.debug('Case result : set_color');
				objekt = {
					type: 'mixed',
					role: 'level.color.rgb',
					unit: '',
					read: true,
					write: true,
				};
				break;

			case 'sw_version':
				this.log.debug('Case result : sw_version');
				objekt = {
					type: 'mixed',
					role: 'info.sw_version',
					unit: '',
					read: true,
					write: false,
				};
				break;

			case 'temp':
				this.log.debug('Case result : temp');
				objekt = {
					type: 'number',
					role: 'value.min',
					unit: unit_device,
					read: true,
					write: false,
				};
				break;

			case 'time':
				this.log.debug('Case result : time');
				objekt = {
					type: 'mixed',
					role: 'value.time',
					unit: '',
					read: true,
					write: false,
				};
				break;

			case 'typ':
				this.log.debug('Case result : typ');
				objekt = {
					type: 'mixed',
					role: 'info.typ',
					unit: '',
					read: true,
					write: true,
				};
				break;

			case 'unit':
				this.log.debug('Case result : unit');
				objekt = {
					type: 'mixed',
					role: 'info.unit',
					unit: '',
					read: true,
					write: true,
				};
				break;

			case 'value':
				this.log.debug('Case result : value');
				objekt = {
					type: 'number',
					role: 'value',
					unit: '',
					read: true,
					write: true,
				};
				break;

			case 'value_color':
				this.log.debug('Case result : value_color');
				objekt = {
					type: 'mixed',
					role: 'level.color.rgb',
					unit: '',
					read: true,
					write: false,
				};
				break;

			case 'version':
				this.log.debug('Case result : version');
				objekt = {
					type: 'mixed',
					role: 'info.version',
					unit: '',
					read: true,
					write: false,
				};
				break;

			default:
				this.log.error('Error in case handling of type identificaton : ' + state);
				return;
		}

		return objekt;

	}

	// Function to decrypt passwords
	decrypt(key, value) {
		let result = '';
		for (let i = 0; i < value.length; ++i) {
			result += String.fromCharCode(key[i % key.length].charCodeAt(0) ^ value.charCodeAt(i));
		}
		this.log.debug('client_secret decrypt ready');
		return result;
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			this.log.info('cleaned everything up...');
			callback();
		} catch (e) {
			callback();
		}
	}

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	async onStateChange(id, state) {
		if (state) {
			// The state was changed

			//Only fire when ack = false (set by admin or script)
			if (state.ack === false){

				this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
				const deviceId = id.split('.');

				this.log.debug('Triggered state : ' + deviceId);
				this.log.debug('Triggered state : ' + deviceId[3]);
				// Handle Post command for configuration related settings
				if(deviceId[3] === 'Configuration'){

					this.log.debug('Change in configuration settings')

					const ap  = await this.getStateAsync(deviceId[2] +  '.' + deviceId[3] +  '.' + 'ap');
					const host = await this.getStateAsync(deviceId[2] +  '.' + deviceId[3] +  '.' + 'host');
					const language = await this.getStateAsync(deviceId[2] +  '.' + deviceId[3] +  '.' + 'language');
					const unit = await this.getStateAsync(deviceId[2] +  '.' + deviceId[3] +  '.' + 'unit');
					// const hwalarm  = await this.getStateAsync(deviceId[2] +  '.' + deviceId[3] +  '.' + 'hwalarm');
					// this.log.info(hwalarm);
					// const fastmode = await this.getStateAsync(deviceId[2] +  '.' + deviceId[3] +  '.' + 'fastmode');
					// this.log.info(fastmode);
					const autoupd = await this.getStateAsync(deviceId[2] +  '.' + deviceId[3] +  '.' + 'autoupd');
					const hwversion =  await this.getStateAsync(deviceId[2] +  '.' + deviceId[3] +  '.' + 'hwversion');

					const array = {
						'ap': ap.val,
						'host': host.val,
						'language': language.val,
						'unit': unit.val,
						// 'hwalarm': false,
						// 'fastmode': false,
						'autoupd': autoupd.val,
						'hwversion': hwversion.val
					};

					if (deviceId[4] === 'restart'){
						const post_url = 'http://' + user + ':' + pass + '@' + this.config.IP + ':' + this.config.receive_port + '/restart';
						axios.post(post_url);
						this.log.debug('Device restart requested');
					}
					if (deviceId[4] === 'checkupdate'){
						const post_url = 'http://' + user + ':' + pass + '@' + this.config.IP + ':' + this.config.receive_port + '/checkupdate';
						axios.post(post_url);
						this.log.debug('Check for updates');
					}
					if (deviceId[4] === 'update'){
						const post_url = 'http://' + user + ':' + pass + '@' + this.config.IP + ':' + this.config.receive_port + '/update';
						axios.post(post_url);
						this.log.debug('Device update requested');
					}
					this.log.debug(JSON.stringify(array));
					this.send_array(array,'/setsystem');
				
				// Handle Post command for sensor related settings
				} else if (deviceId[3] === 'Sensors'){

					this.log.debug('Change in sensor settings' + deviceId[2] +  '.' + deviceId[3] +  '.' + deviceId[4] +  '.' + 'number')

					const number  = await this.getStateAsync(deviceId[2] +  '.' + deviceId[3] +  '.' + deviceId[4] +   '.' + 'number');
					const name = await this.getStateAsync(deviceId[2] +  '.' + deviceId[3] +  '.' + deviceId[4] +   '.' + 'name');
					const typ = await this.getStateAsync(deviceId[2] +  '.' + deviceId[3] +  '.' + deviceId[4] +   '.' + 'typ');
					const min = await this.getStateAsync(deviceId[2] +  '.' + deviceId[3] +  '.' + deviceId[4] +   '.' + 'min');
					const max = await this.getStateAsync(deviceId[2] +  '.' + deviceId[3] +  '.' + deviceId[4] +   '.' + 'max');
					const alarm = await this.getStateAsync(deviceId[2] +  '.' + deviceId[3] +  '.' + deviceId[4] +   '.' + 'alarm');
					const color =  await this.getStateAsync(deviceId[2] +  '.' + deviceId[3] +  '.' + deviceId[4] +   '.' + 'color');					
					const array = {
						'number': number.val,
						'name': name.val,
						'typ': typ.val,
						'min': min.val,
						'max': max.val,
						'alarm': alarm.val,
						'color': color.val
					};

					this.log.debug(JSON.stringify(array));
					this.send_array(array,'/setchannels');

				} else {

					try {

						// assuming else is always pitmaster related : To-Do = implement check in next version
						this.log.debug('Change in sensor settings' + deviceId[2] +  '.' + deviceId[3] +  '.' + deviceId[4] +  '.' + 'number')

						const id = await this.getStateAsync(deviceId[2] +  '.' + deviceId[3] +  '.' + deviceId[4] +   '.' + 'id');
						const channel = await this.getStateAsync(deviceId[2] +  '.' + deviceId[3] +  '.' + deviceId[4] +   '.' + 'channel');
						const pid = await this.getStateAsync(deviceId[2] +  '.' + deviceId[3] +  '.' + deviceId[4] +   '.' + 'pid');
						const value = await this.getStateAsync(deviceId[2] +  '.' + deviceId[3] +  '.' + deviceId[4] +   '.' + 'value');
						const set = await this.getStateAsync(deviceId[2] +  '.' + deviceId[3] +  '.' + deviceId[4] +   '.' + 'set');
						const modus =  await this.getStateAsync(deviceId[2] +  '.' + deviceId[3] +  '.' + deviceId[4] +   '.' + 'modus');					
						const array = [{
							'id': id.val,
							'channel': channel.val,
							'pid': pid.val,
							'value': value.val,
							'set': set.val,
							'typ': modus.val,
						}];

						this.log.debug(JSON.stringify(array));
						this.send_array(array,'/setpitmaster');

					} catch (e) {
						this.log.error('Error in handling pitmaster state change');
						this.log.error(e);
					}

				}
			}

		} else {
			// The state was deleted
			this.log.debug(`state ${id} deleted`);
		}
	}

	send_array(array, type){

		const post_url = 'http://' + user + ':' + pass + '@' + this.config.IP + ':' + this.config.receive_port + type;
		axios.post(post_url, array);

	}

}

// @ts-ignore parent is a valid property on module
if (module.parent) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<ioBroker.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new WlanthermoNano(options);
} else {
	// otherwise start the instance directly
	new WlanthermoNano();
}