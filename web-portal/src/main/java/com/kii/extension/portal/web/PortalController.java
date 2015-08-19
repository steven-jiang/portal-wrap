package com.kii.extension.portal.web;


import javax.servlet.http.HttpServletRequest;

import java.io.IOException;
import java.util.Enumeration;

import org.apache.http.Header;
import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.client.methods.HttpDelete;
import org.apache.http.client.methods.HttpEntityEnclosingRequestBase;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpHead;
import org.apache.http.client.methods.HttpPatch;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.client.methods.HttpPut;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.entity.InputStreamEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.util.FileCopyUtils;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

//import com.kii.extension.portal.service.AppInfoStoreService;
import com.kii.extension.portal.service.TokenManager;
import com.kii.extension.portal.store.AppInfoStore;
import com.kii.extension.sdk.entity.AppInfo;

@Controller
public class PortalController {


	@Autowired
	private AppInfoStore store;

	@Autowired
	private TokenManager tokenManager;

	CloseableHttpClient httpClient = HttpClients.createDefault();


	@RequestMapping(value="/apps/{appName}/**",method={RequestMethod.GET, RequestMethod.HEAD, RequestMethod.POST, RequestMethod.PUT, RequestMethod.PATCH, RequestMethod.DELETE})
	public ResponseEntity redirect(HttpServletRequest request,@PathVariable("appName") String appName){

		tokenManager.verifyToken(request);

		try {
			HttpUriRequest proxyRequest =generalKiiCloudRequest(request);


			HttpResponse response=httpClient.execute(proxyRequest);

			HttpEntity entity=response.getEntity();
			String result="";
			if(entity!=null) {
				 result = new String(FileCopyUtils.copyToByteArray(response.getEntity().getContent()), "UTF-8");
			}


			MultiValueMap<String, String> header=new LinkedMultiValueMap<>();
			for(Header h:response.getAllHeaders()){
				header.add(h.getName(), h.getValue());
			}
			ResponseEntity resp=new ResponseEntity(result,header,HttpStatus.valueOf(response.getStatusLine().getStatusCode()));

			return resp;

		} catch (IOException e) {
			throw new PortalWebException();
		}
	}


	public HttpUriRequest generalKiiCloudRequest(HttpServletRequest clientRequest) throws IOException {


		String appAlias=clientRequest.getHeader("X-Kii-AppID");

		String subUrl=clientRequest.getContextPath();

		AppInfo appInfo=store.getAppInfo(appAlias);

		String url=appInfo.getSiteUrl(subUrl);

		HttpUriRequest request=null;

		switch(clientRequest.getMethod()){
			case "GET":
				request=new HttpGet(url);
				break;
			case "POST":
				request=new HttpPost(url);
				break;
			case "PATCH":
				request=new HttpPatch(url);
				break;
			case "PUT":
				request=new HttpPut(url);
				break;
			case "DELETE":
				request=new HttpDelete(url);
				break;
			case "HEAD":
				request=new HttpHead(url);
				break;
			default:
				throw new IllegalArgumentException();
		}

		if(request instanceof HttpEntityEnclosingRequestBase){

			((HttpEntityEnclosingRequestBase)request).setEntity(new InputStreamEntity(clientRequest.getInputStream()));
		}

		for(Enumeration<String> names= clientRequest.getHeaderNames();names.hasMoreElements();){

			String name=names.nextElement();

			switch(name){
				case "Authorization":
					request.setHeader(name,tokenManager.getAdminToken(appAlias));
					break;
				case "X-Kii-AppID":
					request.setHeader(name,appInfo.getAppID());
					break;
				case "X-Kii-AppKey":
					request.setHeader(name,appInfo.getAppKey());
					break;
				default:
					request.setHeader(name,clientRequest.getHeader(name));
			}
		}

		return request;
	}



}
