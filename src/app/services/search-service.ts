// Copyright (c) 2018 Queensland Cyber Infrastructure Foundation (http://www.qcif.edu.au/)
//
// GNU GENERAL PUBLIC LICENSE
//    Version 2, June 1991
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License along
// with this program; if not, write to the Free Software Foundation, Inc.,
// 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.

import { Observable } from 'rxjs/Observable';
import { Response } from '@angular/http';
import * as _ from 'lodash';

export interface SearchFacetValue {
  value: any;
  count: number;
}

export interface SearchFacet {
  name: string;
  value: any;
}

export interface SearchResult {
  rawResponse: any;
  numFound: number;
  start:number;
  results: any[];
  facets: SearchFacet[];
  facetGroupNames: string[];
}

export interface SearchService {
  search(param:SearchParams): Observable<any>;
  extractData(res: Response, parentField: any, params: SearchParams): SearchResult;
}

export class SearchRefiner {
  name: string;
  title: string;
  type: string;
  value: any;
  alwaysActive: boolean;
  typeLabel: string;
  activeValue: any;
  targetRecordType: string;
  facetCtr: number = 0;

  constructor(opts: any = {}) {
    this.name = opts.name;
    this.title = opts.title;
    this.type = opts.type;
    this.value = opts.value;
    this.typeLabel = opts.typeLabel;
    this.alwaysActive = opts.alwaysActive;
    this.targetRecordType = opts.targetRecordType;
  }

  setCurrentValue(value: any) {
    if (this.type == "facet") {
      this.activeValue = value;
    } else {
      this.value = value;
    }
  }
}

export class SearchParams {
  recordType: string;
  searchText: string;
  activeRefiners: any[];
  refinerConfig: SearchRefiner[];
  rows: number;
  start: number = 0;
  paginationSize: number;
  showResult: boolean = true;
  groupSearchRefinersBy: string;
  maxGroupedResultsCount: number;
  hasAppliedRefiner: boolean = false;
  hideFiltersWhenSearching: boolean = false;
  sortGroupHeadersBy: any;

  constructor(recType: string) {
    this.recordType = recType;
    this.activeRefiners = [];
    this.clear();
  }

  clear() {
    this.searchText = null;
    _.remove(this.activeRefiners, refiner => {
      refiner.value = null;
      refiner.activeValue = null;
      return !refiner.alwaysActive;
    });
  }

  resetCursor() {
    this.start = 0;
    this.hasAppliedRefiner = false;
  }

  getRefinerConfig(name: string) {
    return _.find(this.refinerConfig, (config) => {
      return config.name == name;
    });
  }

  setRefinerConfig(config: SearchRefiner[]) {
    this.refinerConfig = config;
    // parse through and activate those set as active...
    _.forEach(this.refinerConfig, (refinerConfig) => {
      if (refinerConfig.alwaysActive) {
        this.addActiveRefiner(refinerConfig);
      }
    });
  }

  getRefinerQuery() {
    let refinerValues = [];
    _.forEach(this.activeRefiners, (refiner: SearchRefiner) => {
      if (refiner.type == "facet") {
        refinerValues.push(`refiner_${refiner.name}=${_.isEmpty(refiner.activeValue) ? '' : refiner.activeValue }`)
      } else {
        refinerValues.push(`refiner_${refiner.name}=${_.isEmpty(refiner.value) ? '' : refiner.value}`);
      }
    });
    return refinerValues.join(';');
  }

  getRefinerConfigs() {
    return this.refinerConfig;
  }

  addActiveRefiner(refiner: SearchRefiner) {
    const existingRefiner = _.find(this.activeRefiners, (activeRefiner: SearchRefiner) => {
      return activeRefiner.name == refiner.name;
    });
    if (existingRefiner) {
      existingRefiner.value = refiner.value;
    } else {
      this.activeRefiners.push(refiner);
    }
  }

  clearRefinerActiveValues() {
    _.each(this.activeRefiners, (activeRefiner: SearchRefiner) => {
      activeRefiner.activeValue = null;
    });
  }

  parseRefiner(queryStr:string) {
    queryStr = decodeURI(queryStr);
    let refinerValues = {};
    _.forEach(queryStr.split(';'), (q)=> {
      const qObj = q.split('=');
      if (_.startsWith(qObj[0], "refiner_")) {
        const refinerName = qObj[0].split('refiner_')[1];
        refinerValues[refinerName] = qObj[1];
      }
    });
    _.forOwn(refinerValues, (value, name) => {
      const config = this.getRefinerConfig(name);
      config.setCurrentValue(value);
      this.addActiveRefiner(config);
    });
  }

  filterActiveRefinersWithNoData() {
    const removed = _.remove(this.activeRefiners, (refiner: SearchRefiner) => {
      const value = refiner.type == 'exact' ? refiner.value : refiner.activeValue;
      return  !refiner.alwaysActive && (_.isEmpty(value) || _.isUndefined(value));
    });
  }

  hasActiveRefiners() {
    let hasActive = false;
    _.forEach(this.activeRefiners, (refiner: SearchRefiner) => {
      if (!hasActive && (!_.isEmpty(refiner.value))) {
        hasActive = true;
      }
      if (hasActive) {
        return false;
      }
    });
    return hasActive;
  }

  setFacetValues(facets: SearchFacet[]) {
    _.forEach(facets, (facet: any) => {
      const refiner = _.find(this.activeRefiners, (refinerConfig: SearchRefiner) => {
        return refinerConfig.name == facet.name;
      });
      if (refiner) {
        refiner.value = facet.value;
      }
    });
  }

}
