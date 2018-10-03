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
import { SearchService, SearchResult } from './search-service';
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

  public search(searchText: string, searchMode: string, start:number = 0, rows:number = 20) {
    const configSearch = this.config[searchMode];
    const qflist = [];
    _.each(configSearch.queryFields, (qf) => {
      qflist.push(`${qf}:${configSearch.queryFieldValPrefix}${luceneEscapeQuery.escape(searchText)}${configSearch.queryFieldValSuffix}`);
    });
    const opts = {
      imports: {
        start: start,
        rows: rows,
        fieldList: configSearch.fieldList,
        queryFields: qflist.length > 0 ? `${qflist.join(configSearch.queryFieldsBoolOperator)}` : ''
      }
    }
    const url = `${configSearch.solrUrl}${_.template(configSearch.mainQuery, opts)()}`;
    console.log(url);
    return this.http.get(url);
  }

  public extractData(res: Response, parentField: any = null): SearchResult {
    let body = res.json();
    let data = body || {};
    if (parentField) {
        data = body[parentField] || {};
    }
    return new SolrSearchResult(data);
  }
}

export class SolrSearchResult implements SearchResult {
  rawResponse: any;
  numFound: number;
  start:number;
  results: any[];

  constructor(httpResp: any) {
    // parse the SOLR response
    this.rawResponse = httpResp;
    this.numFound = httpResp.response.numFound;
    this.start = httpResp.response.start;
    this.results = httpResp.response.docs;
  }
}
