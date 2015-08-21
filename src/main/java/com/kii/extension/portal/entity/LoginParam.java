package com.kii.extension.portal.entity;

import com.fasterxml.jackson.annotation.JsonProperty;

public class LoginParam {

	private String name;

	private String pwd;

	private String admin;

	private String secret;


	@JsonProperty("client_id")
	public String getAdminName(){
		return admin;
	}

	public void setAdminName(String admin){
		this.admin=admin;
	}

	@JsonProperty("client_secret")
	public String getSecret(){
		return secret;
	}

	public void setSecret(String secret){
		this.secret=secret;
	}

	@JsonProperty("username")
	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	@JsonProperty("password")
	public String getPwd() {
		return pwd;
	}

	public void setPwd(String pwd) {
		this.pwd = pwd;
	}
}
