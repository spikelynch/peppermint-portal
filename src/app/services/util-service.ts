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

import { Injectable } from '@angular/core';
import * as moment from 'moment';
import * as _ from "lodash";
import * as luceneEscapeQuery from 'lucene-escape-query';

declare var document: any;
/**
 * Utility Fns exposed in templates, etc.
 *
 * Author: <a href='https://github.com/shilob' target='_blank'>Shilo Banihit</a>
 *
 */
@Injectable()
export class UtilService {

  constructor() {
  }

  getChildDocWithType(data, type, defVal:any = {}) {
    const match = _.find(data._childDocuments_, (c) => { return c['type_s'] == type});
    return _.isUndefined(match) ? defVal : match;
  }

  getArrAsLinks(arr: any[], target:string, wrapperPrefix: string, wrapperSuffix: string, itemWrapperPrefix: string, itemWrapperSuffix: string) {
    const linkArr = [];
    _.each(arr, (item:any) => {
      linkArr.push(`${itemWrapperPrefix}<a href='${item}' ${target ? `target='${target}'` : ''}>${item}</a>${itemWrapperSuffix}`);
    });
    return `${wrapperPrefix}${linkArr.join(' ')}${wrapperSuffix}`;
  }

  propertyDump(obj, useRegex, excludePropList:string[], translationService, recursive:boolean=false, recurseExcludePropList: string[]) {
    const propertyArr = []
    const regExArr = []
    const wrapperDiv = document.createElement('div');
    if (useRegex) {
      _.each(excludePropList, (ex) => {
        regExArr.push(new RegExp(ex));
      });
    }
    _.forOwn(obj, (propVal, propName) => {
      let excluded = false;
      if (useRegex) {
        _.each(regExArr, (ex) => {
          if (propName.search(ex) != -1) {
            excluded = true;
            return false;
          }
        });
      } else {
        excluded = _.includes(excludePropList, propName);
      }

      if (!excluded) {
        if (_.isArray(propVal)) {
          const vArr = []
          _.each(propVal, (v) => {
            if (recursive && !_.isNil(v)) {
              try {
                const vObj = JSON.parse(v);
                if (!_.isEmpty(vObj) && !_.isString(vObj)) {
                  v = this.propertyDump(vObj, useRegex, recurseExcludePropList, translationService, recursive, recurseExcludePropList);
                }
              } catch (e) {
              }
            }
            wrapperDiv.innerHTML = v;
            wrapperDiv.innerHTML = this.transformToLink(wrapperDiv.innerHTML);
            vArr.push(`<li>${wrapperDiv.innerHTML}</li>`)
          });
          wrapperDiv.innerHTML = `<ul>${vArr.join(' ')}</ul>`
        } else {
          if (propName == '@id' || propName == 'id') {
            wrapperDiv.innerHTML = `<a href='search?recordType=exact&searchText=id:${propVal}'>${propVal}</a>`
          } else {
            wrapperDiv.innerHTML = propVal;
            wrapperDiv.innerHTML = this.transformToLink(wrapperDiv.innerHTML);
          }
        }
        propertyArr.push(`<p><span class='h6'>${translationService.getFacetHumanLabel(propName)}:</span>${wrapperDiv.innerHTML}</p>`)
      }
    });
    return propertyArr.join(' ');
  }

  // only transforms link when string starts with a link..
  transformToLink(htmlVal) {
    if (htmlVal && _.isString(htmlVal) && htmlVal.trim().indexOf('http') == 0) {
      return `<a href='${htmlVal}' target='_blank'>${htmlVal}</a>`;
    }
    return htmlVal;
  }

}
