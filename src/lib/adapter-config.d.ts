// This file extends the AdapterConfig type from "@types/iobroker"

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
	namespace ioBroker {
		interface AdapterConfig {
			deviceList: [
				{
					username: string;
					password: string;
					interval: number;
					ip: string;
				},
			];
		}
	}

	// Definition of Device information
	type Device = {
		username: string;
		password: string;
		interval: number;
		ip: string;
	};
	type DeviceList = [Device];

	// WlanThermo API-Settings
	type DeviceSettings = {
		device: {
			device: string;
			serial: string;
			cpu: string;
			flash_size: number;
			item: string;
			hw_version: string;
			sw_version: string;
			api_version: string;
			language: string;
		};
		system: {
			time: string;
			unit: string;
			ap: string;
			host: string;
			language: string;
			version: string;
			getupdate: string;
			autoupd: boolean;
			prerelease: boolean;
			crashreport: boolean;
			hwversion: string;
		}[string];
		hardware: ['V1'];
		api: {
			version: string;
		};
		sensors: string[{
			type: number;
			name: string;
			fixed: boolean;
		}];
		features: {
			bluetooth: boolean;
			pitmaster: boolean;
		};
		pid: [];
		aktor: ['SSR', 'FAN', 'SERVO'];
		display: {
			updname: string;
			orientation: number;
		};
		iot: {
			PMQhost: string;
			PMQport: number;
			PMQuser: string;
			PMQpass: string;
			PMQqos: number;
			PMQon: boolean;
			PMQint: number;
			CLon: boolean;
			CLtoken: string;
			CLint: number;
			CLurl: string;
			CCLon: boolean;
			CCLint: number;
			CCLurl: string;
		};
	};

	type DeviceData = {
		features: {
			bluetooth: boolean;
			pitmaster: boolean;
		};
		system: {
			time: number;
			unit: string;
			rssi: number;
			online: number;
		}[];
		channel: {
			number: number;
			name: string;
			typ: number;
			temp: number;
			min: number;
			max: number;
			alarm: number;
			color: string;
			fixed: boolean;
			connected: boolean;
		}[];
		pitmaster: {
			type: string;
			pm: {
				id: number;
				channel: number;
				pid: number;
				value: number;
				set: number;
				typ: string;
				typ_last: string;
				set_color: string;
				value_color: string;
			}[];
		};
	};

	type activeDevices = {
		[key: string]: {
			basicInfo: Device;
			data: DeviceData;
			deviceURL?: string;
			settings: DeviceSettings;
			initialised: boolean;
		};
	};
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};
