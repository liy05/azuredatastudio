/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { INextIterator } from 'vs/base/common/iterator';

export interface IView {
	id?: string;
}

export interface IViewItem {
	view: IView;
	top: number;
	height: number;
	width: number;
}

export class HeightMap {

	private heightMap: IViewItem[];
	private indexes: { [item: string]: number; };

	constructor() {
		this.heightMap = [];
		this.indexes = {};
	}

	public getContentHeight(): number {
		let last = this.heightMap[this.heightMap.length - 1];
		return !last ? 0 : last.top + last.height;
	}

	public onInsertItems(iterator: INextIterator<IViewItem>, afterItemId: string | undefined = undefined): number | undefined {
		let viewItem: IViewItem | undefined = undefined;
		let i: number, j: number;
		let totalSize: number;
		let sizeDiff = 0;

		if (afterItemId === undefined) {
			i = 0;
			totalSize = 0;
		} else {
			i = this.indexes[afterItemId] + 1;
			viewItem = this.heightMap[i - 1];

			if (!viewItem) {
				console.error('view item doesnt exist');
				return undefined;
			}

			totalSize = viewItem.top + viewItem.height;
		}

		let boundSplice = this.heightMap.splice.bind(this.heightMap, i, 0);

		let itemsToInsert: IViewItem[] = [];

		while (viewItem = iterator.next()) {
			viewItem.top = totalSize + sizeDiff;

			this.indexes[viewItem.view.id] = i++;
			itemsToInsert.push(viewItem);
			sizeDiff += viewItem.height;
		}

		boundSplice.apply(this.heightMap, itemsToInsert);

		for (j = i; j < this.heightMap.length; j++) {
			viewItem = this.heightMap[j];
			viewItem.top += sizeDiff;
			this.indexes[viewItem.view.id] = j;
		}

		for (j = itemsToInsert.length - 1; j >= 0; j--) {
			this.onInsertItem(itemsToInsert[j]);
		}

		for (j = this.heightMap.length - 1; j >= i; j--) {
			this.onRefreshItem(this.heightMap[j]);
		}

		return sizeDiff;
	}

	public onInsertItem(item: IViewItem): void {
		// noop
	}

	// Contiguous items
	public onRemoveItems(iterator: INextIterator<string>): void {
		let itemId: string | undefined = undefined;
		let viewItem: IViewItem;
		let startIndex: number | undefined = undefined;
		let i = 0;
		let sizeDiff = 0;

		while (itemId = iterator.next()) {
			i = this.indexes[itemId];
			viewItem = this.heightMap[i];

			if (!viewItem) {
				console.error('view item doesnt exist');
				return;
			}

			sizeDiff -= viewItem.height;
			delete this.indexes[itemId];
			this.onRemoveItem(viewItem);

			if (startIndex === undefined) {
				startIndex = i;
			}
		}

		if (sizeDiff === 0 || startIndex === undefined) {
			return;
		}

		this.heightMap.splice(startIndex, i - startIndex + 1);

		for (i = startIndex; i < this.heightMap.length; i++) {
			viewItem = this.heightMap[i];
			viewItem.top += sizeDiff;
			this.indexes[viewItem.view.id] = i;
			this.onRefreshItem(viewItem);
		}
	}

	public onRemoveItem(item: IViewItem): void {
		// noop
	}

	public onRefreshItem(item: IViewItem, needsRender: boolean = false): void {
		// noop
	}

	protected updateSize(item: string, size: number): void {
		let i = this.indexes[item];

		let viewItem = this.heightMap[i];

		viewItem.height = size;
	}

	protected updateTop(item: string, top: number): void {
		let i = this.indexes[item];

		let viewItem = this.heightMap[i];

		viewItem.top = top;
	}

	public itemsCount(): number {
		return this.heightMap.length;
	}

	public itemAt(position: number): string {
		return this.heightMap[this.indexAt(position)].view.id;
	}

	public withItemsInRange(start: number, end: number, fn: (item: string) => void): void {
		start = this.indexAt(start);
		end = this.indexAt(end);
		for (let i = start; i <= end; i++) {
			fn(this.heightMap[i].view.id);
		}
	}

	public indexAt(position: number): number {
		let left = 0;
		let right = this.heightMap.length;
		let center: number;
		let item: IViewItem;

		// Binary search
		while (left < right) {
			center = Math.floor((left + right) / 2);
			item = this.heightMap[center];

			if (position < item.top) {
				right = center;
			} else if (position >= item.top + item.height) {
				if (left === center) {
					break;
				}
				left = center;
			} else {
				return center;
			}
		}

		return this.heightMap.length;
	}

	public indexAfter(position: number): number {
		return Math.min(this.indexAt(position) + 1, this.heightMap.length);
	}

	public itemAtIndex(index: number): IViewItem {
		return this.heightMap[index];
	}

	public itemAfter(item: IViewItem): IViewItem | undefined {
		return this.heightMap[this.indexes[item.view.id] + 1] || undefined;
	}

	public dispose(): void {
		this.heightMap = undefined;
		this.indexes = undefined;
	}
}
