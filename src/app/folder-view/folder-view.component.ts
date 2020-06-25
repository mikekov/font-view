import { CollectionViewer, SelectionChange, DataSource } from '@angular/cdk/collections';
import { FlatTreeControl } from '@angular/cdk/tree';
import { Component, Injectable, OnInit, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { BehaviorSubject, merge, Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { FileService, FolderItem } from '../services/file-service.service';

/** Flat node with expandable and level information */
export class DynamicFlatNode {
	constructor(public item: FolderItem, public level = 1, public isLoading = false) { }

	get name(): string {
		return this.item.name;
	}

	get expandable(): boolean {
		// console.log('exp', this.item.isExpandable);
		return this.item.isExpandable;
	}

	active = false;
}

/*
 * Database for dynamic data. When expanding a node in the tree, the data source will need to fetch
 * the descendants data from the database.
 *
@Injectable({ providedIn: 'root' })
export class DynamicDatabase {
	constructor(fs: FileService) {
		fs.getFolders();
	}

	dataMap = new Map<string, string[]>([
		['Fruits', ['Apple', 'Orange', 'Banana']],
		['Vegetables', ['Tomato', 'Potato', 'Onion']],
		['Apple', ['Fuji', 'Macintosh']],
		['Onion', ['Yellow', 'White', 'Purple']]
	]);

	rootLevelNodes: string[] = ['Fruits', 'Vegetables'];

	/** Initial data from database *
	initialData(): DynamicFlatNode[] {
		return this.rootLevelNodes.map(name => new DynamicFlatNode(name, 0, true));
	}

	getChildren(node: string): string[] | undefined {
		return this.dataMap.get(node);
	}

	isExpandable(node: string): boolean {
		return this.dataMap.has(node);
	}
}
*/

/**
 * File database, it can build a tree structured Json object from string.
 * Each node in Json object represents a file or a directory. For a file, it has filename and type.
 * For a directory, it has filename and children (a list of files or directories).
 * The input will be a json object string, and the output is a list of `FileNode` with nested
 * structure.
 */
export class DynamicDataSource implements DataSource<DynamicFlatNode> {

	dataChange = new BehaviorSubject<DynamicFlatNode[]>([]);

	get data(): DynamicFlatNode[] { return this.dataChange.value; }
	set data(value: DynamicFlatNode[]) {
		this._treeControl.dataNodes = value;
		this.dataChange.next(value);
	}

	constructor(
		private _treeControl: FlatTreeControl<DynamicFlatNode>,
		private _fileService: FileService) { }

	connect(collectionViewer: CollectionViewer): Observable<DynamicFlatNode[]> {
		this._treeControl.expansionModel.changed.subscribe(change => {
			if ((change as SelectionChange<DynamicFlatNode>).added ||
				(change as SelectionChange<DynamicFlatNode>).removed) {
				this.handleTreeControl(change as SelectionChange<DynamicFlatNode>);
			}
		});

		return merge(collectionViewer.viewChange, this.dataChange).pipe(map(() => this.data));
	}

	disconnect(collectionViewer: CollectionViewer): void { }

	/** Handle expand/collapse behaviors */
	handleTreeControl(change: SelectionChange<DynamicFlatNode>) {
		if (change.added) {
			change.added.forEach(node => this.toggleNode(node, true));
		}
		if (change.removed) {
			change.removed.slice().reverse().forEach(node => this.toggleNode(node, false));
		}
	}

	foldersToNodes(folders: FolderItem[], level?: number): DynamicFlatNode[] | undefined {
		if (!folders) return;

		const nodes = folders.map(folder => new DynamicFlatNode(folder, level || 0));

		// scan subfolders serially
		folders.forEach(folder => {
			folder.read(() => {
				if (folder.isExpandable) {
					// console.log('is expandable', folder);
					this.dataChange.next(this.data);
				}
			});
		});

		return nodes;
	}

	/**
	 * Toggle the node, remove from display list
	 */
	toggleNode(node: DynamicFlatNode, expand: boolean) {
		// const children = this._fileService.getFolders(node.item);
		const index = this.data.indexOf(node);
		if (/*!children ||*/ index < 0) { // If no children, or cannot find the node, no op
			return;
		}

		// node.isLoading = true;

		if (expand) {
			node.isLoading = true;

			node.item.read(() => {
				const nodes = this.foldersToNodes(node.item.children, node.level + 1);
				if (nodes) {
					this.data.splice(index + 1, 0, ...nodes);
					this.dataChange.next(this.data);
				}
				/*
				const children = node.item.children;
				if (children) {
					const nodes = children.map(folder =>
						new DynamicFlatNode(folder, node.level + 1, folder.isExpandable));

					this.data.splice(index + 1, 0, ...nodes);

					// scan subfolders serially
					children.forEach(folder => {
						folder.read(() => {
							if (folder.isExpandable) this.dataChange.next(this.data);
						});
					});
				}
*/
				node.isLoading = false;
			});
		}
		else {
			let count = 0;
			for (let i = index + 1; i < this.data.length
				&& this.data[i].level > node.level; i++, count++) { }
			this.data.splice(index + 1, count);

			this.dataChange.next(this.data);
		}

			// notify the change
			// this.dataChange.next(this.data);
			// node.isLoading = false;
		// }, 1000);
	}
}

/**
 * @title Tree with dynamic data
 */
// @Component({
//   selector: 'tree-dynamic-example',
//   templateUrl: 'tree-dynamic-example.html',
//   styleUrls: ['tree-dynamic-example.css']
// })
// export class TreeDynamicExample {
//   constructor(database: DynamicDatabase) {
//     this.treeControl = new FlatTreeControl<DynamicFlatNode>(this.getLevel, this.isExpandable);
//     this.dataSource = new DynamicDataSource(this.treeControl, database);

//     this.dataSource.data = database.initialData();
//   }

//   treeControl: FlatTreeControl<DynamicFlatNode>;

//   dataSource: DynamicDataSource;

//   getLevel = (node: DynamicFlatNode) => node.level;

//   isExpandable = (node: DynamicFlatNode) => node.expandable;

//   hasChild = (_: number, _nodeData: DynamicFlatNode) => _nodeData.expandable;
// }

// import { Component, OnInit } from '@angular/core';

@Component({
	selector: 'folder-view',
	templateUrl: './folder-view.component.html',
	styleUrls: ['./folder-view.component.scss']
})
export class FolderViewComponent implements OnInit {
	@Output() selectFolder = new EventEmitter<string>();

	constructor(fileService: FileService, changes: ChangeDetectorRef) {
		this.treeControl = new FlatTreeControl<DynamicFlatNode>(this.getLevel, this.isExpandable);
		this.dataSource = new DynamicDataSource(this.treeControl, fileService);

		this.dataSource.data = this.dataSource.foldersToNodes(fileService.getRoot());
		// setTimeout(() => {
			// console.log('refrs');
			// changes.detectChanges();
		// }, 2000);
	}

	treeControl: FlatTreeControl<DynamicFlatNode>;

	dataSource: DynamicDataSource;

	getLevel = (node: DynamicFlatNode) => node.level;

	isExpandable = (node: DynamicFlatNode) => node.expandable;

	hasChild = (_: number, _nodeData: DynamicFlatNode) => {
		// console.log('haschild', _nodeData);
		return _nodeData.expandable;
	}

	ngOnInit(): void {
	}

	folderClicked(node: DynamicFlatNode) {
		this.dataSource.data.forEach(node => { node.active = false; });

		const path = node?.item?.path;
		if (path) {
			node.active = true;
			this.selectFolder.next(path);
		}
	}
}
