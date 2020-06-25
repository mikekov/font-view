import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GlyphComponent } from './glyph.component';

describe('GlyphComponent', () => {
  let component: GlyphComponent;
  let fixture: ComponentFixture<GlyphComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GlyphComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GlyphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
