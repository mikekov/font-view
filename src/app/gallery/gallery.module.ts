import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryComponent } from './gallery.component';
import { GalleryItemComponent } from './gallery-item.component';
import { GalleryGroupComponent } from './gallery-group.component';

@NgModule({
	imports: [CommonModule],
	declarations: [GalleryComponent, GalleryItemComponent, GalleryGroupComponent],
	exports: [GalleryComponent, GalleryItemComponent, GalleryGroupComponent],
})
export class GalleryModule { }
