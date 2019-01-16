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

import { Injectable, Inject} from '@angular/core';
import { Location } from '@angular/common';
import { Http, Response } from '@angular/http';
import { ConfigService } from './config-service';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import * as _ from "lodash";
import * as luceneEscapeQuery from 'lucene-escape-query';
import { SearchService, SearchResult, SearchParams, SearchRefiner, SearchFacet, SearchFacetValue } from './search-service';
/**
 * Handles SOLR searches
 *
 * Author: <a href='https://github.com/shilob' target='_blank'>Shilo Banihit</a>
 *
 */
@Injectable()
export class SolrSearchService implements SearchService {
  protected config: any;

  constructor (
    @Inject(Http) protected http: any,
    protected location: Location,
    protected configService: ConfigService
  ) {
    this.configService.getConfig((config) => {
      this.config = config;
    });
  }

  public searchExact(searchParam: SearchParams) {

    const q = searchParam.searchText.substring(0, searchParam.searchText.indexOf(':'));
    const qVal = searchParam.searchText.substring(searchParam.searchText.indexOf(':')+1);
    const searchText = `${q}:${luceneEscapeQuery.escape(qVal)}`;
    const start = searchParam.start;
    const rows = searchParam.rows;

    const configSearch = this.config[searchParam.recordType] || this.config['exact'];

    const opts = {
      imports: {
        start: start,
        rows: rows,
        queryFields: searchText
      }
    }
    const url = `${configSearch.solrUrl}${_.template(configSearch.mainQuery, opts)()}`;
    console.log(url);
    return this.http.get(url);
  }

  public search(searchParam: SearchParams) {
    const searchText = searchParam.searchText;
    const recordType = searchParam.recordType;
    const start = searchParam.start;
    const rows = searchParam.rows;

    const configSearch = this.config[recordType] || this.config['default'];
    const qflist = [];
    _.each(configSearch.queryFields, (qf) => {
      qflist.push(`${qf}:${configSearch.queryFieldValPrefix}${searchText == '*' ? searchText : luceneEscapeQuery.escape(searchText)}${configSearch.queryFieldValSuffix}`);
    });
    const facetList = [];
    _.each(searchParam.activeRefiners, (refiner: SearchRefiner) => {
      switch(refiner.type) {
        case "facet":
          let rq = `facet.field=${refiner.name}`;
          let activeValue = refiner.activeValue;
          if (!_.isEmpty(activeValue)) {
            if (!_.isUndefined(activeValue.value)) {
              activeValue = activeValue.value;
            }
            const val = activeValue && activeValue.indexOf(' ') > 0 ? `"${luceneEscapeQuery.escape(activeValue)}"` : luceneEscapeQuery.escape(activeValue)
            rq = `${rq}&fq=${refiner.name}:${val}`;
          }
          facetList.push(rq);
          break;
      }
    });

    const opts = {
      imports: {
        start: start,
        rows: rows,
        fieldList: configSearch.fieldList,
        queryFields: qflist.length > 0 ? `${qflist.join(configSearch.queryFieldsBoolOperator)}` : '',
        facetFields: facetList.length > 0 ? `&facet=true&${facetList.join('&')}` : '',
        type: luceneEscapeQuery.escape(recordType)
      }
    }
    const url = `${configSearch.solrUrl}${_.template(configSearch.mainQuery, opts)()}`;
    console.log(url);
    return this.http.get(url);
  }

  public extractData(res: Response, parentField: any = null, params: SearchParams = null): SearchResult {
    let body = res.json();
    let data = body || {};
    if (parentField) {
        data = body[parentField] || {};
    }
    return new SolrSearchResult(data, params);
  }
}

export class SolrFacetValue implements SearchFacetValue {
  value: any;
  count:number;
  constructor(value: any, count: number) {
    this.value = value;
    this.count = count;
  }
}

export class SolrFacet implements SearchFacet {
  name: string;
  value: any;

  constructor(name: string, value: any) {
    this.name = name;
    this.value = value;
  }

  addGroup(name, count) {
    this.value[name] = {name: name, groupCount: count, childFacets: {}};
  }

  addToGroup(facetname, facetVal, facetCount) {
    if (_.isUndefined(facetname) || _.isUndefined(facetVal) || _.isUndefined(facetCount) ) {
      return;
    }
    // derive the group name using the facet name
    const nameParts = facetname.split('_______');
    if (nameParts && nameParts.length == 2) {
      // add to all groups
      const solrFacetVal = new SolrFacetValue(facetVal, facetCount)
      _.forOwn(this.value, (grpVal, grpName) => {
        grpVal.childFacets[grpName].push(solrFacetVal)
      });
    } else {
      // add only to the group
      if (_.isEmpty(this.value[nameParts[1]].childFacets[facetname])) {
        this.value[nameParts[1]].childFacets[facetname] = new SolrFacet(facetname, []);
      }
      this.value[nameParts[1]].childFacets[facetname].value.push(new SolrFacetValue(facetVal, facetCount))
    }
  }


}

export class SolrSearchResult implements SearchResult {
  rawResponse: any;
  numFound: number;
  start:number;
  results: any[];
  facets: SearchFacet[];
  facetGroupNames: string[];

  constructor(httpResp: any, params: SearchParams) {
    // parse the SOLR response
    this.rawResponse = httpResp;
    this.numFound = httpResp.response.numFound;
    this.start = httpResp.response.start;
    this.results = httpResp.response.docs;
    if (httpResp.facet_counts) {
      this.facets = [];
      // check if we're grouping search filters...
      if (!_.isEmpty(params.groupSearchRefinersBy)) {
        let mainFacet = null;
        const values = {};
        _.forOwn(httpResp.facet_counts.facet_fields, (facet_field_val: any, facet_field_name:any) => {
          if (facet_field_name  == params.groupSearchRefinersBy) {
            mainFacet = new SolrFacet(facet_field_name, values)
            this.facets.push(mainFacet);
            this.facetGroupNames = [];
            for (var i=0; i < facet_field_val.length; ) {
              const facet_val = facet_field_val[i++];
              const facet_count = facet_field_val[i++];
              mainFacet.addGroup(facet_val, facet_count);
              this.facetGroupNames.push(facet_val);
            }
            return false;
          }
        });
        _.forOwn(httpResp.facet_counts.facet_fields, (facet_field_val: any, facet_field_name:any) => {
          if (facet_field_name  != params.groupSearchRefinersBy) {
            const maxEntries = params.maxGroupedResultsCount * 2;
            for (var i=0; i < maxEntries; ) {
              const facet_val = facet_field_val[i++];
              const facet_count = facet_field_val[i++];
              mainFacet.addToGroup(facet_field_name, facet_val, facet_count);
            }
          }
        });
      } else {
        _.forOwn(httpResp.facet_counts.facet_fields, (facet_field_val: any, facet_field_name:any) => {
          const values = [];
          let maxEntries = facet_field_val.length;
          if (params.maxGroupedResultsCount > 0) {
            maxEntries = params.maxGroupedResultsCount * 2;
          }
          for (var i=0; i < maxEntries; ) {
            const facet_val = facet_field_val[i++];
            const facet_count = facet_field_val[i++];
            values.push(new SolrFacetValue(facet_val, facet_count));
          }
          const searchFacet = new SolrFacet(facet_field_name, values);
          this.facets.push(searchFacet);
        });
      }
    }
  }
}
