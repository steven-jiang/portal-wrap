package com.kii.extension.portal.web;

import javax.servlet.http.HttpServletRequest;
import javax.swing.text.html.parser.ContentModel;

import java.io.IOException;
import java.util.List;
import java.util.Map;

import org.apache.http.Header;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.kii.extension.portal.entity.ErrorCode;
import com.kii.extension.portal.service.TokenManager;
import com.kii.extension.portal.store.AppInfoStore;
import com.kii.extension.portal.store.AppStoreException;
import com.kii.extension.sdk.entity.AppInfo;

@Controller
@RequestMapping("/admin")
public class AdminController {


	@Autowired
	private AppInfoStore service;

	@Autowired
	private ObjectMapper mapper;

	@Autowired
	private TokenManager tokenManager;


	@RequestMapping(value="/{adminName}/password",method={RequestMethod.POST})
	public ResponseEntity doSetAdminPwd(@RequestHeader("Authorization")  String header,@RequestBody String body,@PathVariable("adminName") String adminName ){


		try {
			String name=tokenManager.verifyToken(header);

			Map<String,String> map=mapper.readValue(body, Map.class);

			String oldPwd=map.get("oldPassword");

			String newPwd=map.get("newPassword");

			if(service.verifyUser(adminName,oldPwd)) {
				service.setAdminPwd(adminName, newPwd);
			}

		} catch (IOException e) {
			throw new PortalWebException(e, ErrorCode.JSON_FORMAT_ERROR);
		}catch(AppStoreException ex){
			throw new PortalWebException(ex);
		}

		ResponseEntity resp=new ResponseEntity(HttpStatus.OK);

		return resp;

	}



	@RequestMapping(value="/appInfo/{appAlias}",method={RequestMethod.PUT})
	public ResponseEntity doSetAppInfo(@RequestHeader("Authorization")  String header,@RequestBody String body,@PathVariable("appAlias") String alias){


		try {

			AppInfo info=mapper.readValue(body, AppInfo.class);

			service.addAppInfo(alias,info);

		} catch (IOException e) {
			throw new PortalWebException(e,ErrorCode.JSON_FORMAT_ERROR);
		}catch(AppStoreException ex){
			throw new PortalWebException(ex);
		}

		ResponseEntity resp=new ResponseEntity(HttpStatus.OK);

		return resp;


	}


	@RequestMapping(value="/appInfo/{appAlias}",method={RequestMethod.DELETE})
	public ResponseEntity doDeleteAppInfo(@RequestHeader("Authorization")  String header,@PathVariable("appAlias") String alias) {
		tokenManager.verifyToken(header);

		service.removeAppInfo(alias);

		return new ResponseEntity(HttpStatus.OK);

	}

	@RequestMapping(value="/appInfo",method={RequestMethod.GET})
	public ResponseEntity doGetAppInfo(@RequestHeader("Authorization")  String header){


		tokenManager.verifyToken(header);

		List<Map<String,String>> arrays=service.getAppInfoList();

		try {
			String json=mapper.writeValueAsString(arrays);
			MultiValueMap<String, String> respHeader=new LinkedMultiValueMap<>();
			respHeader.add("Content-Type","application/json");

			ResponseEntity<String> resp= new ResponseEntity(json,respHeader,HttpStatus.OK);

			return resp;

		} catch (JsonProcessingException e) {
			throw new PortalWebException(e,ErrorCode.JSON_FORMAT_ERROR);
		}catch(AppStoreException ex){
			throw new PortalWebException(ex);
		}




	}

}
