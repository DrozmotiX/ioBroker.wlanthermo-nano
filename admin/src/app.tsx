import React from 'react';
import { Theme, withStyles } from '@material-ui/core/styles';

import GenericApp from '@iobroker/adapter-react/GenericApp';
import Settings from './components/settings';
import { GenericAppProps, GenericAppSettings } from '@iobroker/adapter-react/types';
import { StyleRules } from '@material-ui/core/styles';

import translationsEn from './i18n/en.json';
import translationsDe from './i18n/de.json';
import translationsRu from './i18n/ru.json';
import translationsPt from './i18n/pt.json';
import translationsNl from './i18n/nl.json';
import translationsFr from './i18n/fr.json';
import translationsIt from './i18n/it.json';
import translationsEs from './i18n/es.json';
import translationsPl from './i18n/pl.json';
import translationsZhCn from './i18n/zh-cn.json';

const styles = (_theme: Theme): StyleRules => ({
	root: {},
});

class App extends GenericApp {
	constructor(props: GenericAppProps) {
		const extendedProps: GenericAppSettings = {
			...props,
			encryptedFields: [],
			translations: {
				en: translationsEn,
				de: translationsDe,
				ru: translationsRu,
				pt: translationsPt,
				nl: translationsNl,
				fr: translationsFr,
				it: translationsIt,
				es: translationsEs,
				pl: translationsPl,
				'zh-cn': translationsZhCn,
			},
		};
		super(props, extendedProps);
	}

	onConnectionReady(): void {
		// executed when connection is ready
	}

	render() {
		if (!this.state.loaded) {
			return super.render();
		}

		return (
			<div className="App">
				<Settings native={this.state.native} onChange={(attr, value) => this.updateNativeValue(attr, value)} />
				{this.renderError()}
				{this.renderToast()}
				{this.renderSaveCloseButtons()}
			</div>
		);
	}
}

export default withStyles(styles)(App);
