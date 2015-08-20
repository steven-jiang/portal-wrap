package com.kii.extension.portal.test;


import static junit.framework.TestCase.assertEquals;
import static junit.framework.TestCase.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.head;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Map;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.junit4.SpringJUnit4ClassRunner;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.kii.extension.portal.entity.LoginParam;
import com.kii.extension.sdk.entity.LoginInfo;

import junit.framework.Assert;

@RunWith(SpringJUnit4ClassRunner.class)
@WebAppConfiguration
@ContextConfiguration(locations={
		"file:src/main/webapp/WEB-INF/portalWebContext.xml"})
public class TestPortal {

	@Autowired
	private WebApplicationContext wac;

	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper mapper;

	private String token;
	@Before
	public void init() throws Exception {

		this.mockMvc = MockMvcBuilders.webAppContextSetup(this.wac).build();

		LoginParam param=new LoginParam();
		param.setAdminName("admin");
		param.setSecret("123456");



		String result= mockMvc.perform(post("/oauth2/token")
				.header("x-kii-appid", "foo")
				.header("x-kii-appkey", "bar")
				.contentType(MediaType.APPLICATION_JSON)
				.content(mapper.writeValueAsString(param)))
				.andReturn().getResponse().getContentAsString();

		LoginInfo info=mapper.readValue(result, LoginInfo.class);

		token=info.getToken();

	}




	@Test
	public void testGetApp() throws Exception {


		String queryResult=mockMvc.perform(get("/admin/appInfo")
						.header("Authorization", "Bearer " + token)
						.contentType(MediaType.APPLICATION_JSON)
						)
				.andReturn().getResponse().getContentAsString();

		List<Map<String,String>> list=mapper.readValue(queryResult,List.class);

		assertEquals(1,list.size());
		assertEquals("06e806e2", list.get(0).get("appID"));

	}

	@Test
	public void testOperate() throws Exception{


		String queryResult=mockMvc.perform(get("/apps/foo")
				.header("x-kii-appid","foo")
				.header("x-kii-appkey", "bar")
				.header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				)
				.andReturn().getResponse().getContentAsString();

		Map<String,Object> map=mapper.readValue(queryResult,Map.class);

		assertEquals("06e806e2", map.get("appID"));
	}
}
