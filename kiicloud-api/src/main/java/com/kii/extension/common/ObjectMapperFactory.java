package com.kii.extension.common;


import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

@Configuration
public class ObjectMapperFactory{

	final ObjectMapper defaultObjectMapper;

	public ObjectMapperFactory() {
		defaultObjectMapper = createDefaultMapper();
	}

	@Bean
	public ObjectMapper getObjectMapper(){
		return defaultObjectMapper;
	}

	private static ObjectMapper createDefaultMapper() {
		final ObjectMapper result = new ObjectMapper();
		result.setSerializationInclusion(JsonInclude.Include.NON_NULL);
		result.configure(SerializationFeature.INDENT_OUTPUT, true);
		result.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES,false);
//		result.configure(DeserializationFeature.,true);
		return result;
	}


}
