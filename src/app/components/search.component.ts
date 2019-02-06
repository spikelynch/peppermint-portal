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
import 'rxjs/add/operator/catch';
import * as _ from "lodash";
import * as moment from 'moment';

@Component({
  selector: 'search-component',
  templateUrl: './search.component.html'
})
export class SearchComponent {
  searchResults: SearchResult;
  recordType: any;
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
  loadedRecordTypes: boolean = false;
  invalidSearchText: boolean = false;
  searchError: boolean = true;
  cardHeader:string;
  searchLabelStr: string;
  availableRecordTypes:any;

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

  checkSearchText() {
    if (this.recordType == 'exact') {
      this.invalidSearchText = this.currentParam.searchText.indexOf(':') == -1;
    }
  }

  goSearch(rType: any = null) {
    if (rType) {
      this.recordType = rType;
    }
    this.router.navigate(['search'], {queryParams: {searchText: this.currentParam.searchText, recordType: this.recordType, rows: this.currentParam.rows, start: this.currentParam.start, refiner: this.currentParam.getRefinerQuery()}} );
  }

  initSearchConfig(recordType, config, exactSearch:boolean = false) {
    const searchParam = new SearchParams(recordType);
    // build the config...
    const configSearch = config[recordType] || config['default'];
    searchParam.rows = configSearch.rows;
    searchParam.hideFiltersWhenSearching = configSearch.hideFiltersWhenSearching;
    if (!exactSearch) {
      const searchFilterConfig = [];
      _.each(configSearch.searchRefiners, (searchConfig:any) => {
        searchFilterConfig.push(new SearchRefiner(searchConfig));
      });
      searchParam.setRefinerConfig(searchFilterConfig);
      searchParam.paginationSize = configSearch.paginationSize;
      searchParam.groupSearchRefinersBy = configSearch.groupSearchRefinersBy;
      searchParam.maxGroupedResultsCount = configSearch.maxGroupedResultsCount;
      this.paramMap[recordType] = searchParam;
    }
    return searchParam;
  }

  initRecordTypes() {
    const baseRecType = 'all';
    if (_.isUndefined(this.paramMap) || _.isUndefined(this.paramMap[baseRecType])) {
      this.initSearchConfig(baseRecType, this.config);
    }
    const initParam = _.clone(this.paramMap[baseRecType])
    initParam.rows = 0;
    initParam.searchText = '*';
    initParam.showResult = false;
    initParam.hasAppliedRefiner = false;
    initParam.maxGroupedResultsCount = this.paramMap[baseRecType].maxGroupedResultsCount;
    initParam.sortGroupHeadersBy = this.paramMap[baseRecType].sortGroupHeadersBy;
    const sub = this.searchService.search(initParam).subscribe((res:any) => {
      const data = this.searchService.extractData(res, null, initParam);
      console.log('Got record types init:')
      console.log(data);
      // update the record types config depending on the major groups..
      _.each(data.facetGroupNames, (fname:string) => {
        this.config.recordTypes.push(fname);
      });
      this.availableRecordTypes = this.config.recordTypes;
      this.loadedRecordTypes = true;
      sub.unsubscribe();
    });
  }

  getRecordTypeConfig(rType:string = null) {
    if (!rType) {
      rType = this.recordType
    }
    return _.isUndefined(this.config[rType]) ? this.config.default : this.config[rType];
  }

  startSearch() {
    if (!this.loadedRecordTypes) {
      this.initRecordTypes();
    }
    this.route.queryParamMap.pipe(
      switchMap((params: ParamMap) => {
        this.invalidSearchText = false;
        this.searchError = false;

        const searchText = _.trim(params.get('searchText'));
        this.recordType = params.get('recordType');
        this.cardHeader = 'search-results';

        if (!_.isEmpty(searchText) && !_.isEmpty(this.recordType) && this.recordType != 'exact') {
          this.recordType = params.get('recordType');
          this.searchLabelStr = this.getSearchRecordTypeLabel(this.recordType);
          const configSearch = this.getRecordTypeConfig();
          this.updateParamWithType();
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
          }
          this.searchLabelStr = this.getSearchRecordTypeLabel(this.recordType);
          if (_.isUndefined(this.paramMap) || _.isUndefined(this.paramMap[this.recordType])) {
            this.initSearchConfig(this.recordType, this.config);
          }
          this.currentParam = this.paramMap[this.recordType];
          if (this.recordType != 'exact') {
            return this.doBrowseFacets();
          } else {
            this.currentParam = this.initSearchConfig(this.recordType, this.config, true);
            if (!_.isEmpty(searchText)) {
              this.cardHeader = 'summary-header';
              this.currentParam.searchText = searchText;
              return this.getSearchExact();
            } else {
              return Observable.of(null);
            }
          }
        }
      }
    )).subscribe(res => {
      this.searchResults = res;
      if (this.searchResults) {
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
      }
    });
  }

  doBrowseFacets() {
    this.isSearching = true;
    this.currentParam.rows = 0;
    this.currentParam.searchText = '*';
    this.currentParam.showResult = false;
    this.currentParam.hasAppliedRefiner = false;
    this.currentParam.maxGroupedResultsCount = this.paramMap[this.recordType].maxGroupedResultsCount;
    this.currentParam.sortGroupHeadersBy = this.paramMap[this.recordType].sortGroupHeadersBy;
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

  getSearchExact() {
    this.isSearching = true;
    this.currentParam.showResult = true;
    this.showFacets = false;
    return this.searchService.searchExact(this.currentParam).flatMap((res:any) => {
        const data = this.searchService.extractData(res, null, this.currentParam);
        console.log(data);
        this.isSearching = false;
        return Observable.of(data);
    })
    .catch( (e) => {
      console.error("Failed to search by field!")
      console.error(e)
      this.searchError = true;
      this.isSearching = false;
      return Observable.of(null);
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
      actualParam.start = 0;
      this.currentPage = 1;
      this.currentParam = actualParam;
      this.goSearch(targetRefiner.targetRecordType);
    } else {
      this.currentParam.hasAppliedRefiner = true;
      this.currentParam.addActiveRefiner(refinerConfig);
      this.currentParam.start = 0;
      this.currentParam.showResult = true;
      this.currentPage = 1;
      this.currentParam.searchText = _.isEmpty(this.currentParam.searchText) ? '*' : this.currentParam.searchText;
      this.goSearch();
    }
  }

  clearAppliedRefiners(event:any) {
    event.preventDefault();
    this.currentPage = 1;
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
      this.availableRecordTypes = this.config.recordTypes;
      this.startSearch();
    });
  }

  getFirstElem(val) {
    return _.isArray(val) ? val[0] : val;
  }

  getSearchResultForDisplay() {
    let searchConfig = this.getRecordTypeConfig();
    let displayLineConfig = searchConfig.searchResultDisplay || this.config.default.searchResultDisplay;
    const results = [];
    _.each(this.searchResults.results, (res) => {
      const typeVal = this.getFirstElem(res.type);
      if (this.recordType != "exact" && this.recordType != typeVal ) {
        // keep looping to get a non-default dislay config
        _.each(res.type, (t:string) => {
          const sConfig = this.config[t];
          displayLineConfig = (sConfig && sConfig.searchResultDisplay) ? sConfig.searchResultDisplay : this.config.default.searchResultDisplay;
          if (displayLineConfig != searchConfig.searchResultDisplay) {
            // stop search
            return false;
          }
        });
      }
      const templateOpts = {
        imports: {data: {}, moment: moment, utilService: this.utilService, translationService: this.translationService, config: this.config}
      };
      const searchRes = {displayLines: [], res: res, routerLink: '/detail/' + encodeURIComponent(res['id'])};
      _.assign(templateOpts.imports.data, res);
      _.each(displayLineConfig, (dispLineConfig) => {
        searchRes.displayLines.push({template: _.template(dispLineConfig.template, templateOpts)(), link: dispLineConfig.link, field: dispLineConfig.field, type: dispLineConfig.type});
      });
      results.push(searchRes)
    });
    return results;
  }

  isValidRecordType(recType) {
    const found = _.find(this.config.recordTypes, (type) => {
      return recType == type;
    });
    return !_.isUndefined(found)
  }

  updateParamWithType() {
    if (_.isUndefined(this.paramMap) || _.isUndefined(this.paramMap[this.recordType])) {
      this.initSearchConfig(this.recordType, this.config);
    }
    this.currentParam = this.paramMap[this.recordType];
  }

  setRecordType(rType, browse:boolean = false) {
    this.recordType = rType;
    this.showFacets = false;
    this.updateParamWithType();
    this.currentParam.resetCursor();
    this.currentPage = 1;
    if (browse) {
      this.currentParam.searchText = '*';
      this.goSearch();
    } else {
      this.router.navigate(['search'], {queryParams: {recordType: this.recordType }} );
    }
  }

  pageChanged(event:any):void {
    this.currentParam.start = (event.page - 1) * this.currentParam.rows;
    this.goSearch();
  }

  canShowResultSection() {
    return this.searchResults && !this.isSearching && this.currentParam.showResult == true
  }

  canFilterOrBrowse() {
    return this.currentParam.activeRefiners.length > 0;
  }

  isGrouped(refinerConfigs) {
    let groupByConfig = refinerConfigs;
    if (_.isArray(refinerConfigs)) {
      groupByConfig = _.find(refinerConfigs, (r) => {
        return r.name == this.currentParam.groupSearchRefinersBy;
      });
    }
    return groupByConfig && groupByConfig.value &&  !_.isEmpty(groupByConfig.value) && !_.isArray(groupByConfig.value);
  }

  shouldBreak(index, max) {
    return (index % max) == 0;
  }

  getSearchRecordTypeLabel(rType:string) {
    const rTypeKey = `search-${rType}`;
    if (this.translationService.hasKey(rTypeKey)) {
      return this.translationService.t(rTypeKey);
    }
    return `Search ${this.translationService.getFacetHumanLabel(rType)}`;
  }

  shouldShowRefiner(refinerConfig: SearchRefiner) {
    return refinerConfig && !_.isEmpty(refinerConfig.value)
  }
  //
  // getBreadcrumb() {
  //   const crumbs = [];
  //
  //   return crumbs;
  // }
}
