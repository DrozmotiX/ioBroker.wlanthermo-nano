/*
 * Created with @iobroker/create-adapter v2.1.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from '@iobroker/adapter-core';

// Load your modules here, e.g.:
// import * as fs from "fs";
import axios from 'axios'; // Load Axios module to allow handle http get & post
import { MyObjectsDefinitions, BasicStates, buildCommon } from './lib/stateDefinitions';

const activeDevices: activeDevices = {};
const polling: { [key: string]: object } = {};
const ipSerialMapping: { [key: string]: { ip: string } } = {};
const createdObjs: string[] = [];
let initializing = true;

class WlanthermoNano extends utils.Adapter {
	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({
			...options,
			name: 'wlanthermo-nano',
		});
		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	private async onReady(): Promise<void> {
		this.setState('info.connection', false, true);
		const devices: DeviceList = this.config.deviceList;
		this.log.info(`WLANThermo startet, loading ${devices.length} devices`);
		this.log.debug(`Configured  devices ${devices}`);

		// Connect to all devices configured in Adapter Instance
		let amountConnected = 0;
		for (const device in devices) {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			//@ts-expect-error <Array Preparation, not all attributes present yet>
			activeDevices[devices[device].ip] = {};
			activeDevices[devices[device].ip].basicInfo = devices[device];
			activeDevices[devices[device].ip].initialised = false;
			// Start interval
			await this.getDeviceData(devices[device].ip);
			if (activeDevices[devices[device].ip].initialised) {
				amountConnected = amountConnected + 1;
			}
		}

		// Adapter ready
		initializing = false;
		this.log.info(`WLANThermo ready, ${amountConnected} device(s) connected`);
		this.setState('info.connection', true, true);
	}

	private async getDeviceData(deviceIP: string): Promise<void> {
		try {
			if (
				activeDevices[deviceIP] == null ||
				activeDevices[deviceIP].deviceURL == null ||
				!activeDevices[deviceIP].initialised
			) {
				this.log.debug(`${deviceIP} not initialised, try to connect`);
				await this.initialiseDevice(deviceIP);
			} else {
				this.log.debug(`${deviceIP} initialised, update data`);
				const response_deviceData = await axios(activeDevices[deviceIP].deviceURL + '/data', { timeout: 5000 });
				activeDevices[deviceIP].data = response_deviceData.data;
				this.log.debug(`${deviceIP} data | ${JSON.stringify(response_deviceData.data)}`);
				const serial: string = activeDevices[deviceIP].settings.device.serial;

				// Write states for configuration channel
				for (const [key, value] of Object.entries(activeDevices[deviceIP].data.system)) {
					this.log.debug(`Create configuration state ${serial}.Configuration.${key} | ${value}`);
					await this.setObjectAndState(`${serial}.Configuration`, `${key}`, value);
				}

				// Read all sensor related settings and write to states
				const channel = activeDevices[deviceIP].data.channel;
				for (let i = 0; i < channel.length; i++) {
					const sensorRoot = `${serial}.Sensors.Sensor_${1 + +i}`;
					this.log.debug(`Create sensor states ${sensorRoot}`);
					await this.setObjectNotExistsAsync(sensorRoot, {
						type: 'channel',
						common: {
							name: channel[i].name,
						},
						native: {},
					});

					// Load available sensor types
					const sensorTypes: { [key: string]: string } = {};
					for (const sensor in activeDevices[deviceIP].settings.sensors) {
						sensorTypes[sensor] = activeDevices[deviceIP].settings.sensors[sensor].name;
					}

					//  Write states for temperature sensors
					for (const [key, value] of Object.entries(channel[i])) {
						switch (key) {
							case 'typ':
								await this.setObjectAndState(`${sensorRoot}`, `${key}`, value, sensorTypes);
								this.subscribeStates(`${sensorRoot}.${key}`);

								break;

							case 'alarm':
								await this.setObjectAndState(`${sensorRoot}`, `${key}`, value, {
									'0': 'Disabled',
									'1': 'Push-Only',
									'2': 'Speaker-Only',
									'4': 'Push & Speaker',
								});
								break;

							case 'temp':
								await this.setObjectAndState(`${sensorRoot}`, `${key}`, null);
								if (channel[i][key] !== 999) {
									this.setState(`${sensorRoot}.${key}`, {
										val: channel[i][key],
										ack: true,
										expire: activeDevices[deviceIP].basicInfo.interval * 2000,
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

					//  Write states for pitmaster
					const pitmaster = activeDevices[deviceIP].data.pitmaster;
					for (let i = 0; i < pitmaster.pm.length; i++) {
						const stateRoot = `${serial}.Pitmaster.Pitmaster_${1 + i}`;
						this.log.debug(`Create Pitmaster states ${stateRoot}`);
						await this.setObjectNotExistsAsync(stateRoot, {
							type: 'channel',
							common: {
								name: 'Pitmaster',
							},
							native: {},
						});

						for (const [key, value] of Object.entries(pitmaster.pm[i])) {
							if (key === 'typ') {
								await this.setObjectAndState(`${stateRoot}`, `modus`, value);
								// Subscribe on state
								// this.subscribeStates(`${stateRoot}.modus`);
							} else if (key === 'pid') {
								await this.setObjectAndState(`${stateRoot}`, `${key}`, value);
								// Subscribe on state
								// this.subscribeStates(`${stateRoot}.${y}`);
							} else if (key === 'id') {
								const pidProfiles: { [key: string]: string } = {};
								for (const profile in activeDevices[deviceIP].settings.pid) {
									pidProfiles[profile] = activeDevices[deviceIP].settings.pid[profile].name;
								}
								await this.setObjectAndState(`${stateRoot}`, `${key}`, value, pidProfiles);
								// ignore set_color
							} else {
								await this.setObjectAndState(`${stateRoot}`, `${key}`, value);
							}
						}
					}
					this.setState(`${activeDevices[deviceIP].settings.device.serial}.Info.connected`, {
						val: true,
						ack: true,
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
					ack: true,
				});
			} catch (e) {
				console.error(e);
			}
		}

		// Clear running timer
		if (polling[deviceIP]) {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			clearTimeout(polling[deviceIP]);
			polling[deviceIP] = {};
		}

		// Timer to reload data
		this.log.debug(`${deviceIP} Timer triggered`);
		polling[deviceIP] = setTimeout(() => {
			this.log.debug(`${deviceIP} Timer executed`);
			this.getDeviceData(deviceIP);
		}, activeDevices[deviceIP].basicInfo.interval * 1000);
	}

	private async initialiseDevice(ip: string): Promise<void> {
		try {
			const device: Device = activeDevices[ip].basicInfo;
			const url = `http://${device.username}:${device.password}@${device.ip}`;

			// Get Device Settings
			const response_settings = await axios(url + '/settings', { timeout: 5000 });
			if (response_settings == null || response_settings.data == null) return;
			this.log.debug(`${ip} data | ${JSON.stringify(response_settings.data)}`);
			const responseData: DeviceSettings = response_settings.data;
			// Store all data into memory
			activeDevices[device.ip].deviceURL = url;
			activeDevices[device.ip].settings = responseData;
			activeDevices[device.ip].initialised = true;
			ipSerialMapping[activeDevices[device.ip].settings.device.serial] = { ip: device.ip };

			this.log.debug(`${ip} memory cache | ${JSON.stringify(activeDevices[device.ip])}`);

			// Create channels
			await this.deviceStructures(activeDevices[device.ip].settings.device.serial, device.ip);
			// Create States for device settings
			for (const i in response_settings.data.device) {
				this.log.debug(
					`Create device settings state ${activeDevices[device.ip].settings.device.serial}.Info.${i} | ${
						response_settings.data.device[i]
					}`,
				);
				await this.setObjectAndState(
					`${activeDevices[device.ip].settings.device.serial}.Info`,
					`${i}`,
					`${response_settings.data.device[i]}`,
				);
			}

			// Create states for features channel
			for (const [key, value] of Object.entries(activeDevices[device.ip].settings.features)) {
				this.log.debug(
					`Create feature state ${
						activeDevices[device.ip].settings.device.serial
					}.features.${key} | ${value}`,
				);
				await this.setObjectAndState(
					`${activeDevices[device.ip].settings.device.serial}.Features`,
					`${key}`,
					value,
				);
			}

			// Create states for PID Profile
			const pidProfile = activeDevices[device.ip].settings.pid;
			for (let i = 0; i < pidProfile.length; i++) {
				const sensorRoot = `${activeDevices[device.ip].settings.device.serial}.Pitmaster.Profiles.Profile_${
					1 + +i
				}`;
				this.log.debug(`Create profile states ${sensorRoot}`);
				await this.setObjectNotExistsAsync(sensorRoot, {
					type: 'channel',
					common: {
						name: pidProfile[i].name,
					},
					native: {},
				});

				//  Write states for PID profiles
				for (const [key, value] of Object.entries(pidProfile[i])) {
					await this.setObjectAndState(`${sensorRoot}`, `${key}`, value);
					this.subscribeStates(`${sensorRoot}.${key}`);
				}
			}

			this.log.info(
				`${ip} Connected, refreshing data every ${activeDevices[device.ip].basicInfo.interval} seconds`,
			);
			this.getDeviceData(ip);
		} catch (e) {
			this.log.debug(`[initialiseDevice] ${e}`);
			if (initializing) {
				this.log.warn(`${ip} Connection failed, will try again later ${e}`);
			}
			activeDevices[ip].initialised = false;
		}
	}

	private async deviceStructures(serial: string, ip: string): Promise<void> {
		try {
			this.createDevice(serial, {
				name: activeDevices[ip].settings.system.host,
			});

			for (const object in BasicStates) {
				this.log.debug(`Create basic state ${serial}.${object}`);
				await this.setObjectAndState(`${serial}`, `${object}`, null);
			}
		} catch (e) {
			this.log.error(`[deviceStructures] ${e}`);
			this.sendSentry(`[deviceStructures] ${e}`);
		}
	}

	private async setObjectAndState(
		rootDIR: string,
		stateName: string,
		value: any | null,
		stateDropDown?: { [key: string]: string },
	): Promise<void> {
		try {
			let obj: MyObjectsDefinitions = BasicStates[stateName];

			if (!obj) {
				obj = buildCommon(stateName);
			}

			if (stateDropDown != null) {
				obj.common.states = stateDropDown;
			}

			// Check if the object must be created
			if (createdObjs.indexOf(`${rootDIR}.${stateName}`) === -1) {
				await this.extendObjectAsync(`${rootDIR}.${stateName}`, {
					type: obj.type,
					common: JSON.parse(JSON.stringify(obj.common)),
					native: JSON.parse(JSON.stringify(obj.native)),
				});
				// Remember created object for this runtime
				createdObjs.push(`${rootDIR}.${stateName}`);
			}

			if (obj.common.write != null && obj.common.write) {
				this.subscribeStates(`${rootDIR}.${stateName}`);
			}

			if (value != null) {
				await this.setStateChangedAsync(`${rootDIR}.${stateName}`, {
					val: value,
					ack: true,
				});
			}
		} catch (e) {
			this.log.error(`[setObjectAndState] ${e}`);
			this.sendSentry(`[setObjectAndState] ${e}`);
		}
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 */
	private onUnload(callback: () => void): void {
		try {
			// Clear running timer
			for (const device in activeDevices) {
				if (polling[device]) {
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore
					clearTimeout(polling[device]);
					polling[device] = {};
				}
				if (`${activeDevices[device]}` != null && `${activeDevices[device].settings}` != null) {
					this.setState(`${activeDevices[device].settings.device.serial}.Info.connected`, {
						val: false,
						ack: true,
					});
				}
			}

			callback();
		} catch (e) {
			this.log.error(`[onUnload] ${e}`);
			this.sendSentry(`[onUnload] ${e}`);
			callback();
		}
	}

	/**
	 * Is called if a subscribed state changes
	 */
	private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
		try {
			if (state) {
				// The state was changed
				this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
				//Only fire when ack = false (set by admin or script)
				if (!state.ack && state.val != null) {
					this.log.debug(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
					const deviceId = id.split('.');

					const deviceIP = ipSerialMapping[deviceId[2]].ip;
					const url = activeDevices[deviceIP].deviceURL;
					this.log.debug('Triggered state : ' + deviceId[3]);
					// Handle Post command for configuration related settings
					if (deviceId[3] === 'Configuration') {
						if (deviceId[4] === 'restart') {
							const post_url = `${url}/restart`;
							const response = await axios.post(post_url);
							this.setState(`${id}`, { val: false, ack: true });
							this.log.info(`${deviceIP} Restart requested ${response.status}`);
							activeDevices[deviceIP].initialised = false;
						} else if (deviceId[4] === 'checkupdate') {
							const post_url = `${url}/checkupdate`;
							const response = await axios.post(post_url);
							this.setState(`${id}`, { val: false, ack: true });
							this.log.info(`${deviceIP} Check for updates ${response.status}`);
						} else if (deviceId[4] === 'update') {
							const post_url = `${url}/update`;
							const response = await axios.post(post_url);
							this.setState(`${id}`, { val: false, ack: true });
							this.log.info(`${deviceIP} Device update requested ${response.status}`);
						} else {
							this.log.info(
								`${deviceIP} Device configuration changed ${deviceId[4]} ${deviceId[5]} | ${state.val}`,
							);
							activeDevices[deviceIP].settings.system[deviceId[5]] = state.val;
							const array = {
								ap: activeDevices[deviceIP].settings.system.ap,
								host: activeDevices[deviceIP].settings.system.host,
								language: activeDevices[deviceIP].settings.system.language,
								unit: activeDevices[deviceIP].settings.system.unit,
								autoupd: activeDevices[deviceIP].settings.system.autoupd,
								hwversion: activeDevices[deviceIP].settings.system.hwversion,
							};
							this.sendArray(url, array, '/setsystem');
							// Refresh states
							activeDevices[deviceIP].initialised = false;
							await this.getDeviceData(deviceIP);
						}

						// Handle Post command for sensor related settings
					} else if (deviceId[3] === 'Sensors') {
						// Update value of state change to memory
						const sensorID = parseInt(deviceId[4].replace('Sensor_', '')) - 1;
						const currentSensor = activeDevices[deviceIP].data.channel[sensorID];

						(currentSensor as any)[deviceId[5]] = state.val;

						this.log.info(
							`${deviceIP} Sensor configuration changed ${deviceId[4]} ${deviceId[5]} | ${state.val}`,
						);
						// Send changes
						await this.sendArray(url, activeDevices[deviceIP].data.channel[sensorID], '/setchannels');
						// Refresh states
						await this.getDeviceData(deviceIP);
					} else if (deviceId[3] === 'Pitmaster') {
						try {
							this.log.info(
								`${deviceIP} Pitmaster configuration changed ${deviceId[4]} ${deviceId[5]} | ${state.val}`,
							);
							const pitmasterID = parseInt(deviceId[4].replace('Pitmaster_', '')) - 1;
							const currentPM = activeDevices[deviceIP].data.pitmaster.pm[pitmasterID];

							if ([deviceId[5]].toString() !== 'modus') {
								(currentPM as any)[deviceId[5]] = state.val;
							} else {
								currentPM.typ = state.val.toString();
							}
							this.sendArray(url, activeDevices[deviceIP].data.pitmaster.pm, '/setpitmaster');
							// Refresh states
							await this.getDeviceData(deviceIP);
						} catch (e) {
							this.log.error('Error in handling pitmaster state change' + e);
						}
					}
				}
			} else {
				// The state was deleted
				this.log.debug(`state ${id} deleted`);
			}
		} catch (e) {
			this.log.error(`[onStateChange] ${e}`);
			this.sendSentry(`[onStateChange] ${e}`);
		}
	}

	private async sendArray(url: string | undefined, array: object, type: string): Promise<any> {
		try {
			this.log.debug(`Send array ${type} ${JSON.stringify(array)}`);
			if (url == null) return;
			const post_url = `${url}${type}`;
			const respons = axios.post(post_url, array);
			return respons;
		} catch (e) {
			this.log.error(`[sendArray] ${e}`);
			this.sendSentry(`[sendArray] ${e}`);
		}
	}

	private sendSentry(error: string): void {
		if (this.supportsFeature && this.supportsFeature('PLUGINS')) {
			const sentryInstance = this.getPluginInstance('sentry');
			if (sentryInstance) {
				sentryInstance.getSentryObject().captureException(error);
			}
		}
	}
}

if (require.main !== module) {
	// Export the constructor in compact mode
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new WlanthermoNano(options);
} else {
	// otherwise start the instance directly
	(() => new WlanthermoNano())();
}
