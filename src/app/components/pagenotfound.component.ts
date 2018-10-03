import { Component } from '@angular/core';
import { TranslationService } from '../services/translation-service';
import { ConfigService } from '../services/config-service';

@Component({
  selector: 'page-not-found',
  templateUrl: './pagenotfound.component.html'
})
export class PageNotFoundComponent {
  isLoading: boolean = true;
  config: any;
  translatorReady: boolean;

  constructor(protected translationService: TranslationService, protected configService: ConfigService) {
    this.initTranslator(translationService);
    this.initConfig();
  }

  isLoaded() {
    return !this.isLoading && this.translatorReady
  }

  initConfig() {
    this.configService.getConfig((config) => {
      this.config = config;
      this.isLoading = false;
    });
  }

  initTranslator(translationService: TranslationService) {
    this.translationService = translationService;
    translationService.isReady((tService:any) => {
      this.translatorReady = true;
    });
  }
}
