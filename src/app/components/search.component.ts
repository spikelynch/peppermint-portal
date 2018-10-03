import { Component, Inject } from '@angular/core';
import { TranslationService } from '../services/translation-service';
import { ConfigService } from '../services/config-service';
import { SolrSearchService } from '../services/solrsearch-service';
import { SearchService, SearchResult } from '../services/search-service';
import { Router, ActivatedRoute, ParamMap, Params } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/mergeMap';
import * as _ from "lodash";

@Component({
  selector: 'search-component',
  templateUrl: './search.component.html'
})
export class SearchComponent {
  isLoading: boolean = true;
  searchResults: any;
  searchMode: any = 'search-dataset';
  config: any;
  translatorReady: boolean;
  searchText: string;
  startRows: number = 0;
  searchCardClass: string;

  constructor(protected translationService: TranslationService,
    protected configService: ConfigService,
    protected router: Router,
    protected route: ActivatedRoute,
    @Inject(SolrSearchService) protected searchService: SearchService
   ) {

  }

  search(sMode: any = null) {
    if (sMode) {
      this.searchMode = sMode;
    }
    this.router.navigate([''], {queryParams: {searchText: this.searchText, searchMode: this.searchMode}} );
  }

  ngOnInit() {
    this.translationService.isReady((tService:any) => {
      this.translatorReady = true;
    });
    this.configService.getConfig((config) => {
      this.config = config;
      this.route.queryParams.pipe(
        switchMap((params: Params) => {
          if (!_.isEmpty(params['searchText']) && !_.isEmpty(params['searchMode'])) {
            this.searchText = params['searchText'];
            this.searchMode = params['searchMode'];
            const configSearch = config[this.searchMode];
            // do search
            return this.searchService.search(this.searchText, this.searchMode, this.startRows, configSearch.rows).flatMap((res:any) => {
              const data = this.searchService.extractData(res, null);
              console.log(data);
              return Observable.of(data);
            });
          }
          return Observable.of(null);
        }
      )).subscribe(res => {
        this.searchResults = res;
        if (this.searchResults && this.searchResults.numFound > 0) {
          this.searchCardClass = 'bg-success';
        } else {
          this.searchCardClass = 'bg-warning';
        }
      });
    });
  }

  getSearchResultForDisplay() {
    const searchConfig = this.config[this.searchMode];
    const displayLineConfig = searchConfig.searchResultDisplay || this.config.defaultSearchResultDisplay;
    return _.map(this.searchResults.results, (res) => {
      const templateOpts = {
        imports: {data: {}}
      };
      const searchRes = {displayLines: [], res: res, routerLink: '/detail/' + encodeURIComponent(res['id'])};
      _.assign(templateOpts.imports.data, res);
      _.each(displayLineConfig, (dispLineConfig) => {
        searchRes.displayLines.push({template: _.template(dispLineConfig.template, templateOpts)(), link: dispLineConfig.link, field: dispLineConfig.field});
      });
      return searchRes;
    });
  }

  setSearchMode(sMode) {
    this.searchMode = sMode;
  }
}
