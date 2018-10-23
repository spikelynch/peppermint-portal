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
  recordType: any = 'dataset';
  config: any;
  translatorReady: boolean;
  startRows: number = 0;
  searchCardClass: string;
  currentParam: SearchParams;
  paramMap: any;
  isSearching: boolean = false;
  currentPage: number = 1;
  paginationSize: number;

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

  goSearch(rType: any = null) {
    if (rType) {
      this.recordType = rType;
    }
    this.router.navigate(['search'], {queryParams: {searchText: this.currentParam.searchText, recordType: this.recordType, rows: this.currentParam.rows, start: this.currentParam.start, refiner: this.currentParam.getRefinerQuery()}} );
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
    searchParam.paginationSize = configSearch.paginationSize;
    this.paramMap[recordType] = searchParam;
  }

  startSearch() {
    this.route.queryParams.pipe(
      switchMap((params: Params) => {
        const searchText = _.trim(params['searchText']);
        if (!_.isEmpty(searchText) && !_.isEmpty(params['recordType'])) {
          this.recordType = params['recordType'];
          const configSearch = this.config[this.recordType];
          if (_.isUndefined(this.paramMap) || _.isUndefined(this.paramMap[this.recordType])) {
            this.initSearchConfig(this.recordType, this.config);
          }
          this.currentParam = this.paramMap[this.recordType];
          this.currentParam.searchText = searchText;
          this.currentParam.rows = params['rows'] || configSearch.rows;
          this.currentParam.start = params['start'] || 0;
          this.currentParam.parseRefiner(params['refiner'] || '');
          return this.doSearch();
        } else {

          if (_.isEmpty(params['recordType'])) {
            this.recordType = this.config.recordTypes[0]
          } else {
            this.recordType = params['recordType'];
          }
          if (_.isUndefined(this.paramMap) || _.isUndefined(this.paramMap[this.recordType])) {
            this.initSearchConfig(this.recordType, this.config);
          }
          this.currentParam = this.paramMap[this.recordType];
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
      this.isSearching = false;
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
      this.startSearch();
    });
  }

  getSearchResultForDisplay() {
    const searchConfig = this.config[this.recordType];
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

  setRecordType(rType) {
    this.recordType = rType;
    this.router.navigate(['search'], {queryParams: {recordType: this.recordType}} );
  }

  pageChanged(event:any):void {
    this.currentParam.start = (event.page - 1) * this.currentParam.rows;
    this.goSearch();
  }
}
