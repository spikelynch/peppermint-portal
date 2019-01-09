import { Component, Inject, Input, Output, ElementRef, EventEmitter } from '@angular/core';
import { SearchRefiner} from '../services/search-service';
import { TranslationService } from '../services/translation-service';
import * as _ from 'lodash';

@Component({
  selector: 'search-refiner',
  templateUrl: './search-refiner.component.html'
})
export class SearchRefinerComponent {
  @Input() refinerConfig: SearchRefiner;
  @Input() isSearching: boolean;
  @Input() classes: string;
  @Input() maxCols: number;
  @Input() sortGroupHeadersBy: any;
  @Input() translationService: TranslationService;

  @Output() onApplyFilter: EventEmitter<any> = new EventEmitter<any>();
  @Output() onSetRecordType: EventEmitter<any> = new EventEmitter<any>();

  applyFilter(event:any, refinerValue:any = null) {
    event.preventDefault();
    if (this.hasValue()) {
      this.refinerConfig.activeValue = refinerValue;
      this.onApplyFilter.emit(this.refinerConfig);
    }
  }

  setRecordType(event: any, rType: string) {
    event.preventDefault();
    this.onSetRecordType.emit(rType);
  }

  hasValue(val: any = null) {
    return _.isNull(val) ? !_.isEmpty(this.refinerConfig.value) : _.size(val) > 0;
  }

  isGrouped() {
    return this.refinerConfig && this.refinerConfig.value &&  !_.isArray(this.refinerConfig.value);
  }

  getGroupsAsArray(val) {
    const g = []
    _.forOwn(val, (grpVal, grpName) => {
      g.push(grpVal);
    });
    return _.sortBy(g, this.sortGroupHeadersBy);
  }

}
