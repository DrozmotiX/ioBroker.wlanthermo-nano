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

		// Connect to all devices configured in Adapter Instance
		let amountConnected = 0;
		for (const device in devices) {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
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
				await this.initialiseDevice(deviceIP);
			} else {
				// Get Device Data
				const response_deviceData = await axios(activeDevices[deviceIP].deviceURL + '/data', { timeout: 5000 });
				activeDevices[deviceIP].data = response_deviceData.data;
				const serial: string = activeDevices[deviceIP].settings.device.serial;

				// Write states for configuration channel
				for (const i in activeDevices[deviceIP].data.system) {
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore
					const value = activeDevices[deviceIP].data.system[i];
					await this.setObjectAndState(`${serial}.Configuration`, `${i}`, value);
				}

				// Read all sensor related settings and write to states
				const channel = activeDevices[deviceIP].data.channel;
				for (const i in channel) {
					const sensorRoot = `${serial}.Sensors.Sensor_${1 + parseInt(i)}`;
					await this.setObjectNotExistsAsync(sensorRoot, {
						type: 'channel',
						common: {
							name: channel[i].name,
						},
						native: {},
					});

					// Load available sensor types
					const sensorTypes = [];
					for (const sensor in activeDevices[deviceIP].settings.sensors) {
						sensorTypes.push(activeDevices[deviceIP].settings.sensors[sensor].name);
					}

					//  Write states for temperature sensors
					for (const y in channel[i]) {
						switch (y) {
							case 'typ':
								await this.setObjectNotExistsAsync(`${sensorRoot}.${y}`, {
									type: 'state',
									common: {
										name: y,
										role: 'switch.mode',
										read: true,
										type: 'number',
										write: true,
										states: sensorTypes,
										def: 0,
									},
									native: {},
								});

								this.setState(`${sensorRoot}.${y}`, { val: channel[i][y], ack: true });

								break;

							case 'alarm':
								await this.setObjectNotExistsAsync(`${sensorRoot}.${y}`, {
									type: 'state',
									common: {
										name: y,
										role: 'indicator.alarm',
										read: true,
										type: 'number',
										write: false,
										states: {
											'0': 'Disabled',
											'1': 'Push-Only',
											'2': 'Speaker-Only',
											'4': 'Push & Speaker',
										},
										def: 0,
									},
									native: {},
								});
								this.setState(`${sensorRoot}.${y}`, { val: channel[i][y], ack: true });

								break;

							case 'temp':
								await this.setObjectAndState(`${sensorRoot}`, `${y}`, null);
								if (channel[i][y] !== 999) {
									this.setState(`${sensorRoot}.${y}`, {
										val: channel[i][y],
										ack: true,
										expire: activeDevices[deviceIP].basicInfo.interval * 2000,
									});
								} else {
									this.setState(`${sensorRoot}.${y}`, { val: null, ack: true });
								}
								break;

							default:
								// eslint-disable-next-line @typescript-eslint/ban-ts-comment
								// @ts-ignore
								await this.setObjectAndState(`${sensorRoot}`, `${y}`, channel[i][y]);
						}
					}
				}

				//  Write states for pitmaster
				const pitmaster = activeDevices[deviceIP].data.pitmaster;
				for (const i in pitmaster.pm) {
					const stateRoot = `${serial}.Pitmaster.Pitmaster_${1 + parseInt(i)}`;
					await this.setObjectNotExistsAsync(stateRoot, {
						type: 'channel',
						common: {
							name: 'Pitmaster',
						},
						native: {},
					});

					for (const y in pitmaster.pm[i]) {
						if (y === 'typ') {
							await this.setObjectAndState(`${stateRoot}`, `modus`, pitmaster.pm[i][y]);
							// Subscribe on state
							this.subscribeStates(`${stateRoot}.modus`);
						} else if (y === 'pid') {
							await this.setObjectAndState(`${stateRoot}`, `${y}`, pitmaster.pm[i][y]);
							// Subscribe on state
							this.subscribeStates(`${stateRoot}.${y}`);
						} else if (y === 'set_color') {
							// ignore set_color
						} else if (y === 'value_color') {
							// ignore set_color
						} else {
							// eslint-disable-next-line @typescript-eslint/ban-ts-comment
							// @ts-ignore
							await this.setObjectAndState(`${stateRoot}`, `${y}`, pitmaster.pm[i][y]);
						}
					}
				}
				this.setState(`${activeDevices[deviceIP].settings.device.serial}.Info.connected`, {
					val: true,
					ack: true,
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
		polling[deviceIP] = setTimeout(() => {
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
			const responseData: DeviceSettings = response_settings.data;
			// Store all data into memory
			activeDevices[device.ip].deviceURL = url;
			activeDevices[device.ip].settings = responseData;
			activeDevices[device.ip].initialised = true;

			// Create channels
			await this.deviceStructures(activeDevices[device.ip].settings.device.serial, device.ip);
			// Create States for device settings
			for (const i in response_settings.data.device) {
				await this.setObjectAndState(
					`${activeDevices[device.ip].settings.device.serial}.Info`,
					`${i}`,
					`${response_settings.data.device[i]}`,
				);
			}
			this.log.info(
				`${ip} Connected, refreshing data every ${activeDevices[device.ip].basicInfo.interval} seconds`,
			);
			this.getDeviceData(ip);
		} catch (e) {
			console.error(e);
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
				await this.setObjectAndState(`${serial}`, `${object}`, null);
			}
		} catch (e) {
			console.error(e);
		}
	}

	private async setObjectAndState(rootDIR: string, stateName: string, value: any | null): Promise<void> {
		try {
			let obj: MyObjectsDefinitions = BasicStates[stateName];

			if (!obj) {
				obj = buildCommon(stateName);
			}

			// Check if the object must be created
			if (createdObjs.indexOf(`${rootDIR}.${stateName}`) === -1) {
				await this.setObjectNotExistsAsync(`${rootDIR}.${stateName}`, {
					type: obj.type,
					common: JSON.parse(JSON.stringify(obj.common)),
					native: JSON.parse(JSON.stringify(obj.native)),
				});
				// Remember created object for this runtime
				createdObjs.push(`${rootDIR}.${stateName}`);
			}

			if (value != null) {
				await this.setStateChangedAsync(`${rootDIR}.${stateName}`, {
					val: value,
					ack: true,
				});
			}
		} catch (e) {
			console.error(e);
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
				this.setState(`${activeDevices[device].settings.device.serial}.Info.connected`, {
					val: false,
					ack: true,
				});
			}

			callback();
		} catch (e) {
			callback();
		}
	}

	/**
	 * Is called if a subscribed state changes
	 */
	private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
		if (state) {
			// The state was changed
			// this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
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
