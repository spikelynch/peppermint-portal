import { Component, Inject } from '@angular/core';
import { TranslationService } from '../services/translation-service';
import { ConfigService } from '../services/config-service';
import { UtilService } from '../services/util-service';
import { SolrSearchService } from '../services/solrsearch-service';
import { SearchService, SearchResult, SearchParams, SearchRefiner } from '../services/search-service';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
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
  searchResults: SearchResult;
  recordType: any = 'dataset';
  config: any;
  translatorReady: boolean;
  searchCardClass: string;
  currentParam: SearchParams;
  paramMap: any;
  isSearching: boolean = false;
  currentPage: number = 1;
  paginationSize: number;
  showFacets: boolean = false;
  hideFiltersWhenSearching: boolean = false;

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

  toggleFacetShow() {
    this.showFacets = !this.showFacets;
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
    _.each(configSearch.searchRefiners, (searchConfig:any) => {
      searchFilterConfig.push(new SearchRefiner(searchConfig));
    });
    searchParam.setRefinerConfig(searchFilterConfig);
    searchParam.paginationSize = configSearch.paginationSize;
    searchParam.rows = configSearch.rows;
    searchParam.groupSearchRefinersBy = configSearch.groupSearchRefinersBy;
    searchParam.maxGroupedResultsCount = configSearch.maxGroupedResultsCount;
    searchParam.hideFiltersWhenSearching = configSearch.hideFiltersWhenSearching;
    this.paramMap[recordType] = searchParam;
  }

  startSearch() {
    this.route.queryParamMap.pipe(
      switchMap((params: ParamMap) => {
        const searchText = _.trim(params.get('searchText'));
        if (!_.isEmpty(searchText) && !_.isEmpty(params.get('recordType'))) {
          this.recordType = params.get('recordType');
          const configSearch = this.config[this.recordType];
          if (_.isUndefined(this.paramMap) || _.isUndefined(this.paramMap[this.recordType])) {
            this.initSearchConfig(this.recordType, this.config);
          }
          this.currentParam = this.paramMap[this.recordType];
          this.currentParam.searchText = searchText;
          this.currentParam.rows = (_.isUndefined(params.get('rows') || _.isEmpty(params.get('rows')))) ? configSearch.rows : _.toInteger(params.get('rows'));
          this.currentParam.start = (_.isUndefined(params.get('rows') || _.isEmpty(params.get('rows')))) ?  0 :  _.toInteger(params.get('start')) ;
          this.currentParam.parseRefiner(params.get('refiner') || '');
          return this.doSearch();
        } else {
          // setting state when there's no active search
          if (_.isEmpty(params.get('recordType'))) {
            this.recordType = this.config.recordTypes[0]
          } else {
            this.recordType = params.get('recordType');
          }
          if (_.isUndefined(this.paramMap) || _.isUndefined(this.paramMap[this.recordType])) {
            this.initSearchConfig(this.recordType, this.config);
          }
          this.currentParam = this.paramMap[this.recordType];
        }
        return this.doBrowseFacets();
      }
    )).subscribe(res => {
      this.searchResults = res;
      if (this.currentParam.showResult) {
        if (this.searchResults && this.searchResults.numFound > 0) {
          this.searchCardClass = 'text-center bg-success search-panel';
          this.currentParam.setFacetValues(this.searchResults.facets);
        } else {
          this.searchCardClass = 'text-center bg-warning search-panel';
        }
        this.hideFiltersWhenSearching = this.currentParam.hideFiltersWhenSearching;
      } else {
        this.currentParam.setFacetValues(this.searchResults.facets);
        this.currentParam.searchText = '';
        this.currentParam.rows = this.config[this.config.recordTypes[0]].rows;
      }
    });
  }

  doBrowseFacets() {
    this.isSearching = true;
    this.currentParam.rows = 0;
    this.currentParam.searchText = '*';
    this.currentParam.showResult = false;
    this.currentParam.hasAppliedRefiner = false;
    this.currentParam.maxGroupedResultsCount = this.config[this.recordType].maxGroupedResultsCount;
    return this.getSearchData();
  }

  doSearch() {
    this.isSearching = true;
    this.currentParam.showResult = true;
    this.showFacets = false;
    this.currentParam.maxGroupedResultsCount = 0;
    return this.getSearchData();
  }

  getSearchData() {
    return this.searchService.search(this.currentParam).flatMap((res:any) => {
      const data = this.searchService.extractData(res, null, this.currentParam);
      console.log(data);
      this.isSearching = false;
      return Observable.of(data);
    });
  }

  applyRefiner(refinerConfig: SearchRefiner) {
    if (this.isGrouped(refinerConfig)) {
      const facetName = refinerConfig.activeValue.name;
      const targetRefiner = this.currentParam.getRefinerConfig(facetName);
      // now use the target type to switch params...
      if (_.isUndefined(this.paramMap[targetRefiner.targetRecordType])) {
        this.initSearchConfig(targetRefiner.targetRecordType, this.config);
      }
      const actualParam = this.paramMap[targetRefiner.targetRecordType];
      const actualTargetRefiner = actualParam.getRefinerConfig(facetName);
      actualTargetRefiner.activeValue = refinerConfig.activeValue.value;
      // clear the active value so back button Works
      refinerConfig.activeValue = null;
      actualParam.addActiveRefiner(actualTargetRefiner);
      actualParam.searchText = _.isEmpty(this.currentParam.searchText) ? '*' : this.currentParam.searchText;
      actualParam.showResult = true;
      actualParam.hasAppliedRefiner = true;
      actualParam.start = 0;
      this.currentParam = actualParam;
      this.goSearch(targetRefiner.targetRecordType);
    } else {
      this.currentParam.hasAppliedRefiner = true;
      this.currentParam.addActiveRefiner(refinerConfig);
      this.currentParam.start = 0;
      this.currentParam.searchText = _.isEmpty(this.currentParam.searchText) ? '*' : this.currentParam.searchText;
      this.goSearch();
    }
  }

  clearAppliedRefiners(event:any) {
    event.preventDefault();
    this.currentParam.hasAppliedRefiner = false;
    this.currentParam.clearRefinerActiveValues();
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
    let searchConfig = this.config[this.recordType];
    let displayLineConfig = searchConfig.searchResultDisplay || this.config.defaultSearchResultDisplay;
    const results = [];
    _.each(this.searchResults.results, (res) => {
      if (this.isValidRecordType(res.record_type_s)) {
        if (this.recordType != res.record_type_s) {
          const sConfig = this.config[res.record_type_s]
          displayLineConfig = sConfig.searchResultDisplay || this.config.defaultSearchResultDisplay;
        }
        const templateOpts = {
          imports: {data: {}, moment: moment, utilService: this.utilService}
        };
        const searchRes = {displayLines: [], res: res, routerLink: '/detail/' + encodeURIComponent(res['id'])};
        _.assign(templateOpts.imports.data, res);
        _.each(displayLineConfig, (dispLineConfig) => {
          searchRes.displayLines.push({template: _.template(dispLineConfig.template, templateOpts)(), link: dispLineConfig.link, field: dispLineConfig.field, type: dispLineConfig.type});
        });
        results.push(searchRes)
      }
    });
    return results;
  }

  isValidRecordType(recType) {
    const found = _.find(this.config.recordTypes, (type) => {
      return recType == type;
    });
    return !_.isUndefined(found)
  }

  setRecordType(rType) {
    this.recordType = rType;
    this.showFacets = false;
    this.router.navigate(['search'], {queryParams: {recordType: this.recordType}} );
  }

  pageChanged(event:any):void {
    this.currentParam.start = (event.page - 1) * this.currentParam.rows;
    this.goSearch();
  }

  canShowResultSection() {
    return this.searchResults && !this.isSearching && this.currentParam.showResult == true
  }

  isGrouped(refinerConfigs) {
    let groupByConfig = refinerConfigs;
    if (_.isArray(refinerConfigs)) {
      groupByConfig = _.find(refinerConfigs, (r) => {
        return r.name == this.currentParam.groupSearchRefinersBy;
      });
    }
    return groupByConfig && groupByConfig.value &&  !_.isEmpty(groupByConfig.value);
  }
  //
  // getBreadcrumb() {
  //   const crumbs = [];
  //
  //   return crumbs;
  // }
}
