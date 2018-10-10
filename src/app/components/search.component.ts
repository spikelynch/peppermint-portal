import { Component, Inject } from '@angular/core';
import { TranslationService } from '../services/translation-service';
import { ConfigService } from '../services/config-service';
import { UtilService } from '../services/util-service';
import { SolrSearchService } from '../services/solrsearch-service';
import { SearchService, SearchResult, SearchParams, SearchRefiner } from '../services/search-service';
import { Router, ActivatedRoute, ParamMap, Params } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/mergeMap';
import * as _ from "lodash";
import * as moment from 'moment';

@Component({
  selector: 'search-component',
  templateUrl: './search.component.html'
})
export class SearchComponent {
  searchResults: any;
  searchMode: any = 'search-dataset';
  config: any;
  translatorReady: boolean;
  startRows: number = 0;
  searchCardClass: string;
  currentParam: SearchParams;
  paramMap: any;
  isSearching: boolean = false;

  constructor(
    protected translationService: TranslationService,
    protected configService: ConfigService,
    protected router: Router,
    protected route: ActivatedRoute,
    protected utilService: UtilService,
    @Inject(SolrSearchService) protected searchService: SearchService
   )
  {
    this.paramMap = {};
  }

  goSearch(sMode: any = null) {
    if (sMode) {
      this.currentParam.recordType = sMode;
    }
    this.router.navigate(['search'], {queryParams: {searchText: this.currentParam.searchText, recordType: this.currentParam.recordType, rows: this.currentParam.rows, start: this.currentParam.start, refiner: this.currentParam.getRefinerQuery()}} );
  }

  initSearchConfig(recordType, config) {
    const searchParam = new SearchParams(recordType);
    // build the config...
    const configSearch = config[recordType];
    const searchFilterConfig = [];
    _.each(configSearch.searchFilters, (searchConfig:any) => {
      searchFilterConfig.push(new SearchRefiner(searchConfig));
    });
    searchParam.setRefinerConfig(searchFilterConfig);
    this.paramMap[recordType] = searchParam;
  }

  startSearch() {
    this.route.queryParams.pipe(
      switchMap((params: Params) => {
        if (!_.isEmpty(params['searchText']) && !_.isEmpty(params['recordType'])) {
          const searchText = params['searchText'];
          const recordType = params['recordType'];
          const configSearch = this.config[recordType];
          if (_.isUndefined(this.paramMap) || _.isUndefined(this.paramMap[recordType])) {
            this.initSearchConfig(recordType, this.config);
          }
          this.currentParam = this.paramMap[recordType];
          this.currentParam.searchText = searchText;
          this.currentParam.rows = params['rows'] || configSearch.rows;
          this.currentParam.start = params['start'] || 0;
          this.currentParam.parseRefiner(params['refiner'] || '');
          return this.doSearch();
        }
        return Observable.of(null);
      }
    )).subscribe(res => {
      this.searchResults = res;
      if (this.searchResults && this.searchResults.numFound > 0) {
        this.searchCardClass = 'text-center bg-success';
        this.currentParam.setFacetValues(this.searchResults.facets);
      } else {
        this.searchCardClass = 'text-center bg-warning';
      }
    });
  }

  doSearch() {
    this.isSearching = true;
    return this.searchService.search(this.currentParam).flatMap((res:any) => {
      const data = this.searchService.extractData(res, null);
      console.log(data);
      return Observable.of(data);
    });
  }

  applyRefiner(refinerConfig: SearchRefiner) {
    this.currentParam.addActiveRefiner(refinerConfig);
    this.goSearch();
  }

  ngOnInit() {
    this.translationService.isReady((tService:any) => {
      this.translatorReady = true;
    });
    this.configService.getConfig((config) => {
      this.config = config;
      // set the default...
      this.initSearchConfig(config.searchModes[0], config);
      this.currentParam = this.paramMap[config.searchModes[0]];
      this.startSearch();
    });
  }

  getSearchResultForDisplay() {
    const searchConfig = this.config[this.searchMode];
    const displayLineConfig = searchConfig.searchResultDisplay || this.config.defaultSearchResultDisplay;
    return _.map(this.searchResults.results, (res) => {
      const templateOpts = {
        imports: {data: {}, moment: moment, utilService: this.utilService}
      };
      const searchRes = {displayLines: [], res: res, routerLink: '/detail/' + encodeURIComponent(res['id'])};
      _.assign(templateOpts.imports.data, res);
      _.each(displayLineConfig, (dispLineConfig) => {
        searchRes.displayLines.push({template: _.template(dispLineConfig.template, templateOpts)(), link: dispLineConfig.link, field: dispLineConfig.field, type: dispLineConfig.type});
      });
      return searchRes;
    });
  }

  setSearchMode(sMode) {
    this.searchMode = sMode;
  }
}
