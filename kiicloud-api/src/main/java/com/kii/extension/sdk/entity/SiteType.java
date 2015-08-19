package com.kii.extension.sdk.entity;

public enum SiteType {

	US("api"),SG("api-sg"),JP("api-jp"),CN3("api-cn3");

	private String url;

	SiteType(String site){
		url="https://"+site+".kii.com";
	}

	public String getSiteUrl(){
		return url;
	}


}


