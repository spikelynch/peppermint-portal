import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpModule } from '@angular/http';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule} from "@angular/forms";

import { TranslateI18NextModule } from 'ngx-i18next';
import { TranslationService } from './services/translation-service';
import { ConfigService } from './services/config-service';
import { SolrSearchService } from './services/solrsearch-service';
import { PageNotFoundComponent } from './components/pagenotfound.component';
import { SearchComponent } from './components/search.component';
import { DetailComponent } from './components/detail.component';
import { AppComponent } from './app.component';

// route config
const appRoutes: Routes = [
  { path: 'search', component: SearchComponent },
  { path: '', redirectTo: 'search', pathMatch: 'full' },
  { path: 'detail/:recordId', component: DetailComponent },
  { path: '**', component: PageNotFoundComponent }
];
// module def
@NgModule({
  declarations: [
    PageNotFoundComponent,
    SearchComponent,
    DetailComponent,
    AppComponent
  ],
  imports: [
    HttpModule,
    BrowserModule,
    TranslateI18NextModule,
    RouterModule.forRoot(appRoutes),
    FormsModule
  ],
  providers: [
    TranslationService,
    ConfigService,
    SolrSearchService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
