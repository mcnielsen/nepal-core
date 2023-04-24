export interface AlBundledContentDescriptor {
    resourceId:string;
    modified:string;
    contentType:string;
    content:any;
}

export interface AlContentBundle {
    resources:{[resourceId:string]:AlBundledContentDescriptor};
}
