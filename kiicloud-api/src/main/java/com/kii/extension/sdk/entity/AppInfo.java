package com.kii.extension.sdk.entity;

import java.io.Serializable;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

public class AppInfo implements Serializable{




//	private String appAlias;

	private String appID;

	private String appKey;

	private SiteType site;

	private String clientID;

	private String clientSecret;


	public AppInfo(){

	}

	public AppInfo(AppInfo info){
//		this.appAlias=info.getAppAlias();
		this.appID=info.getAppID();
		this.appKey=info.getAppKey();
		this.clientID=info.getClientID();
		this.clientSecret=info.getClientSecret();
		this.site=info.getSite();
	}

	@JsonProperty("appID")
	public String getAppID() {
		return appID;
	}


	@JsonProperty("appKey")
	public String getAppKey() {
		return appKey;
	}

	@JsonIgnore
	public String getSiteUrl(String subUrl) {
		return site.getSiteUrl()+"/api/apps/"+appID+"/"+subUrl;
	}


	@JsonProperty("clientID")
	public String getClientID() {
		return clientID;
	}

	@JsonProperty("secret")
	public String getClientSecret() {
		return clientSecret;
	}

	public void setAppID(String appID) {
		this.appID = appID;
	}

	public void setAppKey(String appKey) {
		this.appKey = appKey;
	}

	public SiteType getSite() {
		return site;
	}

	@JsonProperty("site")
	public void setSiteValue(String site){
		this.site=SiteType.valueOf(site);
	}

	@JsonIgnore
	public void setSite(SiteType site) {
		this.site = site;
	}

	public void setClientID(String clientID) {
		this.clientID = clientID;
	}

	public void setClientSecret(String clientSecret) {
		this.clientSecret = clientSecret;
	}

//	@JsonIgnore
//	public String getAppAlias() {
//		return appAlias;
//	}
//
//	public void setAppAlias(String appAlias) {
//		this.appAlias = appAlias;
//	}
}
