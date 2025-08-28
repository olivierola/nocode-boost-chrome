// Types Chrome pour l'extension
declare namespace chrome {
  export namespace runtime {
    export interface InstalledDetails {
      reason: string;
      previousVersion?: string;
    }
    
    export interface MessageSender {
      tab?: chrome.tabs.Tab;
      frameId?: number;
      id?: string;
      url?: string;
      origin?: string;
    }
    
    export function onInstalled(callback: (details: InstalledDetails) => void): void;
    export function onMessage(callback: (request: any, sender: MessageSender, sendResponse: (response: any) => void) => void): void;
    export function sendMessage(message: any, callback?: (response: any) => void): void;
    export function sendMessage(extensionId: string, message: any, callback?: (response: any) => void): void;
  }
  
  export namespace storage {
    export namespace local {
      export function set(items: Record<string, any>, callback?: () => void): void;
      export function get(keys: string | string[] | null, callback: (items: Record<string, any>) => void): void;
      export function remove(keys: string | string[], callback?: () => void): void;
      export function clear(callback?: () => void): void;
    }
  }
  
  export namespace action {
    export function onClicked(callback: (tab: chrome.tabs.Tab) => void): void;
  }
  
  export namespace tabs {
    export interface Tab {
      id?: number;
      index: number;
      windowId: number;
      highlighted: boolean;
      active: boolean;
      pinned: boolean;
      url?: string;
      title?: string;
      favIconUrl?: string;
      status?: string;
      incognito: boolean;
      width?: number;
      height?: number;
      sessionId?: string;
    }
    
    export interface ChangeInfo {
      status?: string;
      url?: string;
      pinned?: boolean;
      audible?: boolean;
      discarded?: boolean;
      autoDiscardable?: boolean;
      mutedInfo?: chrome.tabs.MutedInfo;
      favIconUrl?: string;
      title?: string;
    }
    
    export interface MutedInfo {
      muted: boolean;
      reason?: string;
      extensionId?: string;
    }
    
    export function onUpdated(callback: (tabId: number, changeInfo: ChangeInfo, tab: Tab) => void): void;
    export function query(queryInfo: any, callback: (result: Tab[]) => void): void;
    export function get(tabId: number, callback: (tab: Tab) => void): void;
  }
}

export {};