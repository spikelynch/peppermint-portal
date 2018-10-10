import { Component, Inject, Input, Output, ElementRef, EventEmitter } from '@angular/core';
import { SearchRefiner} from '../services/search-service';
import * as _ from "lodash";

@Component({
  selector: 'search-refiner',
  templateUrl: './search-refiner.component.html'
})
export class SearchRefinerComponent {
  @Input() refinerConfig: SearchRefiner;
  @Input() isSearching: boolean;
  @Output() onApplyFilter: EventEmitter<any> = new EventEmitter<any>();

  applyFilter(event:any, refinerValue:any = null) {
    event.preventDefault();
    if (this.hasValue()) {
      this.refinerConfig.activeValue = refinerValue;
      this.onApplyFilter.emit(this.refinerConfig);
    }
  }

  hasValue() {
    return !_.isEmpty(this.refinerConfig.value);
  }

}
