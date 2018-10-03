import { Component } from '@angular/core';
import { TranslationService } from '../services/translation-service';
import { ConfigService } from '../services/config-service';
import { Router, ActivatedRoute, ParamMap, Params } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'detail-component',
  templateUrl: './detail.component.html'
})
export class DetailComponent {
  isLoading: boolean = true;
  config: any;
  translatorReady: boolean;
  recordId: string;

  constructor(
    protected translationService: TranslationService,
    protected configService: ConfigService,
    protected route: ActivatedRoute
  ) {
  }

  ngOnInit() {
    this.route.queryParams.pipe(
      switchMap((params: Params) => {
        this.recordId = params['recordId'];
        return Observable.of(null)
      }
    ))
    .subscribe(whatever => {

    });
  }
}
