package com.kii.extension.sdk.impl;

import java.io.IOException;

import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.util.FileCopyUtils;

import com.fasterxml.jackson.databind.ObjectMapper;


@Component
public class KiiCloudClient {


	CloseableHttpClient httpClient = HttpClients.createDefault();

	@Autowired
	private ObjectMapper mapper;

	public <T> T executeRequest(HttpUriRequest request,Class<T> cls){


		String result=executeRequest(request);

		try {
			return  mapper.readValue(result, cls);
		} catch (IOException e) {
			e.printStackTrace();
			throw new IllegalArgumentException(e);
		}

	}

	public String executeRequest(HttpUriRequest request){

		try{
			HttpResponse response=httpClient.execute(request);

			if(request.getMethod().equals("DELETE")){
				return "";
			}

			HttpEntity entity=response.getEntity();
			if(entity!=null) {

				String result = new String(FileCopyUtils.copyToByteArray(response.getEntity().getContent()), "UTF-8");

				return result;
			}else{
				return "";
			}

		} catch (IOException e) {
			throw new IllegalArgumentException(e);
		}

	}



}
