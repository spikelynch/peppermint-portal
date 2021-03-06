import { Component } from '@angular/core';
import { TranslationService } from './services/translation-service';
import { ConfigService } from './services/config-service';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/mergeMap';
import * as _ from "lodash";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  isLoading: boolean = true;
  searchResults: any;
  searchMode: any = 'search-dataset';
  config: any;
  translatorReady: boolean;
  searchText: string;
  startRows: number = 0;
  searchCardClass: string;

  constructor(protected translationService: TranslationService,
    protected configService: ConfigService
   ) {
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
