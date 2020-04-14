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

let data,  unit_device, polling, initialise, user = {}, pass = {}; // , info, networklist; ==> these options from APi are currenlty not used

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

		this.log.info('WLANThermo startet, loading devices');
		setTimeout(sentryTest, 10000);
		// Nasty workarround only test
		initialise = true;

		await this.intervall();
		
	}

	async intervall(){
		this.log.debug('intervall startet');
		this.log.debug('List all devices' + JSON.stringify(this.config.devices));

		const devices = this.config.devices;
		// Get timer settings from adaptre configuration
		const intervall_time = this.config.Time_Sync * 1000;

		for (const i in devices){
			
			// Check if credentials are not empty
			if (devices[i].Username !== '' && devices[i].Password !== ''){
				this.log.debug('Start timer for : ' + JSON.stringify(devices[i]));
				this.getForeignObject('system.config', (err, obj) => {

					this.log.debug('Device settings : ' + JSON.stringify(obj));

					if (obj && obj.native && obj.native.secret) {
					//noinspection JSUnresolvedVariable
						pass[i] = this.decrypt(obj.native.secret, devices[i].Password);
					} else {
					//noinspection JSUnresolvedVariable
						pass[i] = this.decrypt('Zgfr56gFe87jJOM', devices[i].Password);
					}

					// Call update routine first time
					this.get_http(i);

				});
			} else {
				// this.log.error('*** Credentials missing for device ' + device  + ' you will not be able to adjust settings (Read Only Mode) ! ***');
				// this.setForeignState('system.adapter.' + this.namespace + '.alive', false);
			}

			this.log.debug('Loop of devices' + JSON.stringify(devices[i]));

		}

		// Clear running timer
		(function () {if (polling) {clearTimeout(polling); polling = null;}})();
		
		// timer
		polling = setTimeout( () => {

			this.intervall();

		}, intervall_time);

	}

	async get_http(index){
		try {

			const devices = this.config.devices;
			this.log.info('Get http function started for device : ' + index + ' array : ' +  JSON.stringify(devices));
				
			const url = 'http://' + devices[index].Username + ':' + pass[index] + '@' + devices[index].ip + ':' + devices[index].port;
			this.log.debug('URL : ' + url);
			this.log.debug('URL build');
			const response_data = await axios(url + '/data');
			this.log.debug(response_data);
			data = response_data.data;	
			this.log.debug('Data from get_http function : ' + JSON.stringify(data));

			const response_settings = await axios(url + '/settings');
			const settings = response_settings.data;
			
			this.log.debug('Settings from get_http function For  device ' + index + ' : ' + JSON.stringify(settings));			

			unit_device = '°' + settings.system.unit;
			this.log.debug('Settings for unit  of device ' + index + ' : ' + JSON.stringify(settings.system.unit));	

			// API present but information not interesting to be used, disabled
			// const response_info = await axios('http://91.40.191.99:9999/info');
			// info = response_info.data;
			// this.log.debug('Info from get_http function : ' + JSON.stringify(info));

			// const_response_networklist = await axios('http://91.40.191.99:9999/networklist');
			// networklist = response_networklist.data;
			// this.log.debug('Networklist from get_http function : ' + JSON.stringify(networklist));		

			// Create devices and channels
			await this.create_device(index, settings);

			// Create states and update data
			await this.create_states(settings);


			// Set initialisation to be finalized
			// initialise = false;

		} catch (e) {

			this.log.debug('Unable to connect to device ' + index + ' , please check IP / port / username and password !' + e);

		}
	}

	async create_device(index, settings){
		this.log.debug(index);
		// if (initialise){ 
		this.log.debug('Device and channel creation for : ' + JSON.stringify(settings));
		this.createDevice(settings.device['serial'],{
			name: settings.system['host']
		});
		this.createChannel(settings.device['serial'],'Sensors');
		this.createChannel(settings.device['serial'],'Info');
		this.createChannel(settings.device['serial'],'Pitmaster');
		// }
	}	

	async create_states(settings){
		const expire_time  = (this.config.Time_Sync * 4);

		// Read all info related settings and write to states
		this.log.debug('State creation for : ' + JSON.stringify(settings));
		
		// Create info channel
		for (const i in settings.device){
			this.log.debug('State root : ' + settings.device['serial'] + '.Info.' + i);
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

		await this.setObjectNotExistsAsync(settings.device['serial'] + '.Info.connected', {
			type: 'state',
			common: {
				name: 'Device reachable',
				type: 'boolean',
				read: true,
				write: false,
				role: 'info.connected',
			},
			native: {},
		});
		this.setState(settings.device['serial'] + '.Info.connected',{ val: true ,ack: true, expire: 30 });


		// Subscribe  on system  channels
		this.subscribeStates(settings.device['serial'] + '.Info.connected'); 
		this.subscribeStates(settings.device['serial'] + '.Configuration.restart');
		this.subscribeStates(settings.device['serial'] + '.Configuration.checkupdate');
		this.subscribeStates(settings.device['serial'] + '.Configuration.update');

		for (const i in settings.system){

			// Get type values for state		
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


				switch (y) {

					case('typ'):

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

						break;

					case ('alarm'):

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

						break;

					case ('temp'):

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

						if (data.channel[i][y]!== 999) {

							this.setState(settings.device['serial'] + '.Sensors.Sensor_' + (1 + parseInt(i)) + '.' + y,{ val: data.channel[i][y] ,ack: true, expire: expire_time });

						} else {

							this.setState(settings.device['serial'] + '.Sensors.Sensor_' + (1 + parseInt(i)) + '.' + y,{ val: 0 ,ack: true});

						}
						break;

					default:
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
		// if (initialise){ 
			
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

		// this.log.debug(settings.device[name]);

		await this.setObjectNotExistsAsync(state_root + name, {
			type: 'state',
			common: attr_array,
			native: {},
		});

		if (state_attr[name].write === true){
			this.subscribeStates(state_root + name);
		}

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
						this.log.error('Error in handling pitmaster state change' + e);
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