import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppComponent } from './app.component';
import { FontTileComponent } from './font-tile/font-tile.component';
import { GalleryModule } from './gallery/gallery.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSliderModule } from '@angular/material/slider';
import { MatTreeModule } from '@angular/material/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { VirtualGridComponent } from './virtual-grid/virtual-grid.component';
import { CanvasDrawComponent } from './canvas-draw/canvas-draw.component';
import { FolderViewComponent } from './folder-view/folder-view.component';
import { ResizeDirective } from './utils/resize.directive';
import { GlyphComponent } from './glyph/glyph.component';
import { CharmapComponent } from './charmap/charmap.component';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
	declarations: [
		AppComponent,
		CanvasDrawComponent,
		FontTileComponent,
		VirtualGridComponent,
		FolderViewComponent,
		ResizeDirective,
		GlyphComponent,
		CharmapComponent
	],
	imports: [
		BrowserModule, GalleryModule, BrowserAnimationsModule, HttpClientModule,
		MatProgressBarModule, MatSliderModule, MatTreeModule, MatIconModule, MatButtonModule,
		MatDialogModule, MatBadgeModule, MatChipsModule
	],
	providers: [],
	bootstrap: [AppComponent],
	entryComponents: [GlyphComponent]
})
export class AppModule { }
